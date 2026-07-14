import type { RuleDecl } from '../ast';
import { type RuleDocument } from '@jibo-studio/skill-model';

export function lowerRule(rule: RuleDecl): RuleDocument {
  if (rule.mode === 'raw' && rule.raw != null) {
    return { content: rule.raw.endsWith('\n') ? rule.raw : `${rule.raw}\n` };
  }

  const phrases = rule.phrases ?? [];
  const alts = phrases
    .map((p) => {
      const action = p.action ? `{action='${p.action}'}` : '';
      return `    ( (${p.phrase})${action} )`;
    })
    .join(' |\n');

  const content = `# Generated from JiboScript rule ${rule.name}
TopRule = $* (
${alts || "    ( (hello){action='hello'} )"}
) $*;
`;
  return { content };
}
