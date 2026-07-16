import type {
  BehaviorDecl,
  BehaviorNode,
  FlowDecl,
  FlowStep,
  MimDecl,
  MimPromptDecl,
  RuleDecl,
  SkillMeta,
  SkillModule,
} from './ast';
import { type Diagnostic, emptySpan, type SourceSpan } from './diagnostics';
import { lex, type Token, type TokenKind } from './lexer';

export interface ParseResult {
  module: SkillModule;
  diagnostics: Diagnostic[];
}

export function parseSkillSource(source: string, file = 'skill.jibo'): ParseResult {
  const { tokens, diagnostics: lexDiags } = lex(source);
  const parser = new Parser(tokens, file);
  const module = parser.parseModule();
  return {
    module,
    diagnostics: [...lexDiags, ...parser.diagnostics],
  };
}

class Parser {
  readonly diagnostics: Diagnostic[] = [];
  private index = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly file: string,
  ) {}

  parseModule(): SkillModule {
    const module: SkillModule = {
      file: this.file,
      flows: [],
      mims: [],
      rules: [],
      behaviors: [],
    };

    this.skipNewlines();
    while (!this.check('EOF')) {
      if (this.matchKeyword('skill')) {
        module.skill = this.parseSkill();
      } else if (this.matchKeyword('flow')) {
        module.flows.push(this.parseFlow());
      } else if (this.matchKeyword('mim')) {
        module.mims.push(this.parseMim());
      } else if (this.matchKeyword('behavior')) {
        module.behaviors.push(this.parseBehavior());
      } else if (this.matchKeyword('raw_rule') || this.matchKeyword('rule')) {
        module.rules.push(this.parseRule(this.previous().value === 'raw_rule'));
      } else {
        const tok = this.peek();
        this.error(tok.span, `Unexpected token '${tok.value || tok.kind}'`);
        this.advance();
      }
      this.skipNewlines();
    }

    return module;
  }

  private parseSkill(): SkillMeta {
    const start = this.previous().span;
    this.expect('COLON');
    this.expectNewlineBlock();
    this.expect('INDENT');
    const meta: SkillMeta = {
      name: '',
      display: '',
      launch: '',
      prompt: '',
      span: start,
    };
    while (!this.check('DEDENT') && !this.check('EOF')) {
      this.skipNewlines();
      if (this.check('DEDENT') || this.check('EOF')) break;
      const keyTok = this.expectIdentOrKeyword();
      this.expect('EQ');
      const value = this.expectString();
      switch (keyTok.value) {
        case 'name':
          meta.name = value;
          break;
        case 'display':
          meta.display = value;
          break;
        case 'launch':
          meta.launch = value;
          break;
        case 'prompt':
          meta.prompt = value;
          break;
        default:
          this.error(keyTok.span, `Unknown skill field '${keyTok.value}'`);
      }
      this.skipNewlines();
    }
    this.expect('DEDENT');
    if (!meta.name) this.error(start, 'skill.name is required');
    if (!meta.launch) this.error(start, 'skill.launch is required');
    if (!meta.display) meta.display = meta.name;
    if (!meta.prompt) meta.prompt = meta.launch;
    return meta;
  }

  private parseFlow(): FlowDecl {
    const nameTok = this.expectIdentOrKeyword();
    const start = nameTok.span;
    this.expect('COLON');
    this.expectNewlineBlock();
    this.expect('INDENT');
    const steps: FlowStep[] = [];
    while (!this.check('DEDENT') && !this.check('EOF')) {
      this.skipNewlines();
      if (this.check('DEDENT') || this.check('EOF')) break;
      steps.push(this.parseFlowStep());
      this.skipNewlines();
    }
    this.expect('DEDENT');
    return { name: nameTok.value, steps, span: start };
  }

  private parseFlowStep(): FlowStep {
    if (this.matchKeyword('call')) {
      const name = this.expectIdentOrKeyword().value;
      const inputs = this.matchKeyword('with') ? this.parseBindings() : {};
      return { kind: 'subflow', name, inputs, span: this.previous().span };
    }
    if (this.matchKeyword('announce') || this.matchKeyword('query')) {
      const kind = this.previous().value === 'query' ? 'query' : 'announce';
      const mim = this.expectIdentOrKeyword().value;
      const data = this.matchKeyword('with') ? this.parseBindings() : {};
      return { kind, mim, data, span: this.previous().span };
    }
    if (this.matchKeyword('eval')) {
      const source = this.expectString();
      return { kind: 'eval', source, span: this.previous().span };
    }
    if (this.matchKeyword('animate')) {
      const name = this.expectStringOrIdent();
      return { kind: 'animation', name, span: this.previous().span };
    }
    if (this.matchKeyword('run')) {
      const name = this.expectIdentOrKeyword().value;
      return { kind: 'behavior', name, span: this.previous().span };
    }
    if (this.matchKeyword('end')) {
      return { kind: 'end', span: this.previous().span };
    }
    const tok = this.peek();
    this.error(tok.span, `Unknown flow statement '${tok.value}'`);
    this.advance();
    return { kind: 'end', span: tok.span };
  }

  private parseMim(): MimDecl {
    const nameTok = this.expectIdentOrKeyword();
    this.expect('COLON');
    this.expectNewlineBlock();
    this.expect('INDENT');
    let mimType: MimDecl['mimType'] = 'announcement';
    let ruleName: string | undefined;
    const prompts: MimPromptDecl[] = [];
    while (!this.check('DEDENT') && !this.check('EOF')) {
      this.skipNewlines();
      if (this.check('DEDENT') || this.check('EOF')) break;
      if (this.matchKeyword('type')) {
        this.expect('EQ');
        const typeTok = this.expectIdentOrKeyword();
        if (typeTok.value === 'announcement' || typeTok.value === 'query' || typeTok.value === 'confirm') {
          mimType = typeTok.value;
        } else {
          this.error(typeTok.span, `Unsupported MIM type '${typeTok.value}'`);
        }
      } else if (this.matchKeyword('say')) {
        const text = this.expectString();
        let category = 'Entry-Core';
        let sub = 'AN';
        while (this.matchIdentOrKeywordName('category') || this.matchIdentOrKeywordName('sub')) {
          const field = this.previous().value;
          this.expect('EQ');
          const value = this.expectString();
          if (field === 'category') category = value;
          else sub = value;
        }
        prompts.push({ text, category, sub, span: this.previous().span });
      } else if (this.matchIdentOrKeywordName('rule')) {
        this.expect('EQ');
        ruleName = this.expectStringOrIdent();
      } else {
        const tok = this.peek();
        this.error(tok.span, `Unknown mim field '${tok.value}'`);
        this.advance();
      }
      this.skipNewlines();
    }
    this.expect('DEDENT');
    return { name: nameTok.value, mimType, ruleName, prompts, span: nameTok.span };
  }

  private parseBehavior(): BehaviorDecl {
    const nameTok = this.expectIdentOrKeyword();
    this.expect('COLON');
    this.expectNewlineBlock();
    this.expect('INDENT');
    const root = this.parseBehaviorNode();
    this.skipNewlines();
    this.expect('DEDENT');
    return { name: nameTok.value, root, span: nameTok.span };
  }

  private parseBehaviorNode(): BehaviorNode {
    if (this.matchKeyword('sequence') || this.matchKeyword('selector')) {
      const kind = this.previous().value as 'sequence' | 'selector';
      const span = this.previous().span;
      this.expect('COLON');
      this.expectNewlineBlock();
      this.expect('INDENT');
      const children: BehaviorNode[] = [];
      while (!this.check('DEDENT') && !this.check('EOF')) {
        this.skipNewlines();
        if (this.check('DEDENT') || this.check('EOF')) break;
        children.push(this.parseBehaviorNode());
        this.skipNewlines();
      }
      this.expect('DEDENT');
      return { kind, children, span };
    }
    if (this.matchKeyword('play_audio')) {
      const path = this.expectString();
      return { kind: 'play_audio', path, span: this.previous().span };
    }
    if (this.matchKeyword('script')) {
      const source = this.expectString();
      return { kind: 'script', source, span: this.previous().span };
    }
    const tok = this.peek();
    this.error(tok.span, `Unknown behavior node '${tok.value}'`);
    this.advance();
    return { kind: 'script', source: '() => {}', span: tok.span };
  }

  private parseRule(raw: boolean): RuleDecl {
    const nameTok = this.expectIdentOrKeyword();
    this.expect('COLON');
    this.skipNewlines();
    if (this.check('STRING')) {
      const content = this.advance().value;
      return {
        name: nameTok.value,
        mode: 'raw',
        raw: content.endsWith('\n') ? content : `${content}\n`,
        span: nameTok.span,
      };
    }
    this.expect('INDENT');
    if (raw) {
      // Collect raw lines until dedent using remaining tokens' text via string joins is awkward;
      // require a string body for raw_rule. Fall back to match phrases if typed like rule.
      const phrases: Array<{ phrase: string; action?: string }> = [];
      let rawChunks: string[] = [];
      while (!this.check('DEDENT') && !this.check('EOF')) {
        this.skipNewlines();
        if (this.check('DEDENT') || this.check('EOF')) break;
        if (this.check('STRING') && !this.checkAhead('EQ') && phrases.length === 0 && rawChunks.length === 0) {
          // unlikely
        }
        if (this.matchKeyword('match')) {
          const phrase = this.expectString();
          let action: string | undefined;
          if (this.matchIdentOrKeywordName('action')) {
            this.expect('EQ');
            action = this.expectStringOrIdent();
          }
          phrases.push({ phrase, action });
        } else if (this.check('STRING')) {
          rawChunks.push(this.advance().value);
        } else {
          // Reconstruct a simple raw line from tokens until newline.
          const parts: string[] = [];
          while (!this.check('NEWLINE') && !this.check('DEDENT') && !this.check('EOF')) {
            parts.push(this.advance().value || '');
          }
          rawChunks.push(parts.join(' '));
          this.skipNewlines();
        }
        this.skipNewlines();
      }
      this.expect('DEDENT');
      if (rawChunks.length && phrases.length === 0) {
        return {
          name: nameTok.value,
          mode: 'raw',
          raw: `${rawChunks.join('\n')}\n`,
          span: nameTok.span,
        };
      }
      return { name: nameTok.value, mode: 'phrases', phrases, span: nameTok.span };
    }

    const phrases: Array<{ phrase: string; action?: string }> = [];
    while (!this.check('DEDENT') && !this.check('EOF')) {
      this.skipNewlines();
      if (this.check('DEDENT') || this.check('EOF')) break;
      this.expectKeyword('match');
      const phrase = this.expectString();
      let action: string | undefined;
      if (this.matchIdentOrKeywordName('action')) {
        this.expect('EQ');
        action = this.expectStringOrIdent();
      }
      phrases.push({ phrase, action });
      this.skipNewlines();
    }
    this.expect('DEDENT');
    return { name: nameTok.value, mode: 'phrases', phrases, span: nameTok.span };
  }

  private parseBindings(): Record<string, string> {
    const out: Record<string, string> = {};
    do {
      const key = this.expectIdentOrKeyword().value;
      this.expect('EQ');
      out[key] = this.parseExpression();
    } while (this.match('COMMA'));
    return out;
  }

  private parseExpression(): string {
    // Dotted identifiers or string literals become JS expression text.
    if (this.check('STRING')) {
      return JSON.stringify(this.advance().value);
    }
    const parts = [this.expectIdentOrKeyword().value];
    while (this.match('DOT')) {
      parts.push(this.expectIdentOrKeyword().value);
    }
    return parts.join('.');
  }

  private expectNewlineBlock(): void {
    if (this.check('NEWLINE')) {
      this.skipNewlines();
      return;
    }
    // Allow single-line bodies later; for now require newline before indent.
  }

  private skipNewlines(): void {
    while (this.match('NEWLINE')) {
      // absorb
    }
  }

  private matchKeyword(value: string): boolean {
    if (this.check('KEYWORD') && this.peek().value === value) {
      this.advance();
      return true;
    }
    return false;
  }

  private expectKeyword(value: string): Token {
    if (this.matchKeyword(value)) return this.previous();
    const tok = this.peek();
    this.error(tok.span, `Expected '${value}'`);
    return tok;
  }

  private matchIdentOrKeywordName(value: string): boolean {
    if (
      (this.check('IDENT') || this.check('KEYWORD')) &&
      this.peek().value === value
    ) {
      this.advance();
      return true;
    }
    return false;
  }

  private expectIdentOrKeyword(): Token {
    if (this.check('IDENT') || this.check('KEYWORD')) return this.advance();
    const tok = this.peek();
    this.error(tok.span, 'Expected identifier');
    return tok;
  }

  private expectString(): string {
    if (this.check('STRING')) return this.advance().value;
    const tok = this.peek();
    this.error(tok.span, 'Expected string');
    this.advance();
    return '';
  }

  private expectStringOrIdent(): string {
    if (this.check('STRING')) return this.advance().value;
    return this.expectIdentOrKeyword().value;
  }

  private match(kind: TokenKind): boolean {
    if (this.check(kind)) {
      this.advance();
      return true;
    }
    return false;
  }

  private expect(kind: TokenKind): Token {
    if (this.check(kind)) return this.advance();
    const tok = this.peek();
    this.error(tok.span, `Expected ${kind}`);
    return tok;
  }

  private check(kind: TokenKind): boolean {
    return this.peek().kind === kind;
  }

  private checkAhead(kind: TokenKind): boolean {
    return this.tokens[this.index + 1]?.kind === kind;
  }

  private advance(): Token {
    const tok = this.peek();
    if (tok.kind !== 'EOF') this.index += 1;
    return tok;
  }

  private previous(): Token {
    return this.tokens[Math.max(this.index - 1, 0)]!;
  }

  private peek(): Token {
    return this.tokens[this.index] ?? this.tokens[this.tokens.length - 1]!;
  }

  private error(span: SourceSpan | undefined, message: string): void {
    this.diagnostics.push({
      severity: 'error',
      message,
      span: span ?? emptySpan(),
      code: 'parse',
    });
  }
}
