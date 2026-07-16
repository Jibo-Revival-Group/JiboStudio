import { type Diagnostic, type SourceSpan, spanAt } from './diagnostics';

export type TokenKind =
  | 'IDENT'
  | 'STRING'
  | 'NUMBER'
  | 'COLON'
  | 'COMMA'
  | 'EQ'
  | 'LPAREN'
  | 'RPAREN'
  | 'LBRACE'
  | 'RBRACE'
  | 'LBRACKET'
  | 'RBRACKET'
  | 'DOT'
  | 'AT'
  | 'NEWLINE'
  | 'INDENT'
  | 'DEDENT'
  | 'EOF'
  | 'KEYWORD';

export interface Token {
  kind: TokenKind;
  value: string;
  line: number;
  column: number;
  span: SourceSpan;
}

const KEYWORDS = new Set([
  'skill',
  'flow',
  'mim',
  'behavior',
  'rule',
  'raw_rule',
  'call',
  'announce',
  'query',
  'eval',
  'animate',
  'run',
  'end',
  'with',
  'say',
  'type',
  'sequence',
  'selector',
  'play_audio',
  'script',
  'match',
  'true',
  'false',
]);

function makeToken(kind: TokenKind, value: string, line: number, column: number): Token {
  return {
    kind,
    value,
    line,
    column,
    span: spanAt(line, column, Math.max(value.split('\n')[0]?.length ?? 1, 1)),
  };
}

export function lex(source: string): { tokens: Token[]; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const tokens: Token[] = [];
  const text = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n');
  const indentStack = [0];

  const emitDedents = (target: number, line: number, column: number) => {
    while (indentStack.length > 1 && indentStack[indentStack.length - 1]! > target) {
      indentStack.pop();
      tokens.push(makeToken('DEDENT', '', line, column));
    }
    if (indentStack[indentStack.length - 1] !== target) {
      diagnostics.push({
        severity: 'error',
        message: 'Inconsistent indentation',
        span: spanAt(line, column, 1),
        code: 'indent',
      });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    let line = lines[i]!;

    // Skip pure-comment / empty lines without affecting indentation.
    const trimmedPreview = stripInlineComment(line).trim();
    if (!trimmedPreview) continue;

    let col = 0;
    let indent = 0;
    while (col < line.length && (line[col] === ' ' || line[col] === '\t')) {
      indent += line[col] === '\t' ? 4 : 1;
      col += 1;
    }

    const current = indentStack[indentStack.length - 1]!;
    if (indent > current) {
      indentStack.push(indent);
      tokens.push(makeToken('INDENT', '', lineNo, 1));
    } else if (indent < current) {
      emitDedents(indent, lineNo, 1);
    }

    while (col < line.length) {
      const ch = line[col]!;
      if (ch === ' ' || ch === '\t') {
        col += 1;
        continue;
      }
      if (ch === '#') break;

      // Triple-quoted strings may span lines.
      if (
        (ch === '"' || ch === "'") &&
        line.slice(col, col + 3) === ch + ch + ch
      ) {
        const quote = ch + ch + ch;
        let value = '';
        let endLine = i;
        let endCol = col + 3;
        let closed = false;
        let scanLine = line;
        let scanCol = col + 3;
        let scanIdx = i;
        while (scanIdx < lines.length) {
          scanLine = lines[scanIdx]!;
          while (scanCol <= scanLine.length) {
            if (scanLine.slice(scanCol, scanCol + 3) === quote) {
              closed = true;
              endLine = scanIdx;
              endCol = scanCol + 3;
              break;
            }
            if (scanCol < scanLine.length) {
              value += scanLine[scanCol]!;
            } else if (scanIdx < lines.length - 1) {
              value += '\n';
            }
            scanCol += 1;
          }
          if (closed) break;
          scanIdx += 1;
          scanCol = 0;
        }
        if (!closed) {
          diagnostics.push({
            severity: 'error',
            message: 'Unterminated triple-quoted string',
            span: spanAt(lineNo, col + 1, 3),
            code: 'string',
          });
          i = lines.length;
          break;
        }
        tokens.push(makeToken('STRING', stripCommonIndent(value), lineNo, col + 1));
        // Advance lexer to after closing quotes.
        i = endLine;
        line = lines[i]!;
        col = endCol;
        continue;
      }

      if (ch === '"' || ch === "'") {
        const quote = ch;
        let end = col + 1;
        let value = '';
        let closed = false;
        while (end < line.length) {
          const c = line[end]!;
          if (c === '\\' && end + 1 < line.length) {
            value += line[end + 1]!;
            end += 2;
            continue;
          }
          if (c === quote) {
            closed = true;
            end += 1;
            break;
          }
          value += c;
          end += 1;
        }
        if (!closed) {
          diagnostics.push({
            severity: 'error',
            message: 'Unterminated string literal',
            span: spanAt(lineNo, col + 1, Math.max(line.length - col, 1)),
            code: 'string',
          });
          col = line.length;
          continue;
        }
        tokens.push(makeToken('STRING', value, lineNo, col + 1));
        col = end;
        continue;
      }

      if (ch === '@') {
        tokens.push(makeToken('AT', '@', lineNo, col + 1));
        col += 1;
        continue;
      }

      const single: Record<string, TokenKind> = {
        ':': 'COLON',
        ',': 'COMMA',
        '=': 'EQ',
        '(': 'LPAREN',
        ')': 'RPAREN',
        '{': 'LBRACE',
        '}': 'RBRACE',
        '[': 'LBRACKET',
        ']': 'RBRACKET',
        '.': 'DOT',
      };
      if (single[ch]) {
        tokens.push(makeToken(single[ch]!, ch, lineNo, col + 1));
        col += 1;
        continue;
      }

      if (/[0-9]/.test(ch)) {
        let end = col + 1;
        while (end < line.length && /[0-9.]/.test(line[end]!)) end += 1;
        tokens.push(makeToken('NUMBER', line.slice(col, end), lineNo, col + 1));
        col = end;
        continue;
      }

      if (/[A-Za-z_]/.test(ch)) {
        let end = col + 1;
        while (end < line.length && /[A-Za-z0-9_]/.test(line[end]!)) end += 1;
        const value = line.slice(col, end);
        tokens.push(makeToken(KEYWORDS.has(value) ? 'KEYWORD' : 'IDENT', value, lineNo, col + 1));
        col = end;
        continue;
      }

      diagnostics.push({
        severity: 'error',
        message: `Unexpected character '${ch}'`,
        span: spanAt(lineNo, col + 1, 1),
        code: 'char',
      });
      col += 1;
    }

    tokens.push(makeToken('NEWLINE', '\n', lineNo, Math.max(line.length, 1)));
  }

  emitDedents(0, Math.max(lines.length, 1), 1);
  tokens.push(makeToken('EOF', '', Math.max(lines.length, 1), 1));
  return { tokens, diagnostics };
}

function stripInlineComment(line: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '\\' && (inSingle || inDouble)) {
      i += 1;
      continue;
    }
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === '#' && !inSingle && !inDouble) return line.slice(0, i);
  }
  return line;
}

function stripCommonIndent(value: string): string {
  const lines = value.replace(/^\n/, '').replace(/\n$/, '').split('\n');
  const indents = lines
    .filter((l) => l.trim().length > 0)
    .map((l) => l.match(/^[ \t]*/)?.[0]?.length ?? 0);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(min)).join('\n');
}
