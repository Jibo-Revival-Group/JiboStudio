export interface RuleDocument {
  content: string;
}

export function parseRule(content: string): RuleDocument {
  return { content };
}

export function serializeRule(doc: RuleDocument): string {
  return doc.content;
}

export function createEmptyRule(): RuleDocument {
  return {
    content: `# Jibo NLU rule
# Returns semantic parse results for matching utterances.

TopRule = $* (
    $example{example = 'matched'}
) $*;

example = (hello | hi | hey);
`,
  };
}

export function validateRuleSyntax(content: string): string[] {
  const errors: string[] = [];
  if (!content.trim()) {
    errors.push('Rule file is empty.');
  }
  if (!content.includes('TopRule')) {
    errors.push('Rule should define a TopRule.');
  }
  if (content.includes(';;')) {
    errors.push('Double semicolons are invalid.');
  }
  return errors;
}
