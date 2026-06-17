import { useMemo, useState } from 'react';
import {
  parseRule,
  serializeRule,
  validateRuleSyntax,
  createEmptyRule,
} from '@jibo-studio/skill-model';
import './rules-editor.css';

export interface RulesEditorProps {
  content: string;
  onChange: (content: string) => void;
  onValidate?: (errors: string[]) => void;
  readOnly?: boolean;
}

const RULE_SNIPPETS = [
  {
    label: 'Yes/No',
    content: `# Returns yes/no parse
TopRule = $* (
    $yesno{yesNo = yesno._yes_no}
) $*;

yesno = ($factory:yes_no{_yes_no = yes_no._nl} | ok{_yes_no = 'yes'});
`,
  },
  {
    label: 'Keyword trigger',
    content: `TopRule = ($* hello jibo $* | $* hey jibo $*);
`,
  },
];

export function RulesEditor({ content, onChange, onValidate, readOnly }: RulesEditorProps) {
  const doc = useMemo(() => parseRule(content), [content]);
  const [testInput, setTestInput] = useState('');
  const errors = useMemo(() => validateRuleSyntax(doc.content), [doc.content]);

  const handleChange = (value: string) => {
    onChange(serializeRule({ content: value }));
    onValidate?.(validateRuleSyntax(value));
  };

  const insertSnippet = (snippet: string) => {
    handleChange(snippet);
  };

  const lines = doc.content.split('\n').length;

  return (
    <div className="rules-editor">
      <div className="rules-editor__toolbar">
        <span className="rules-editor__title">NLU Rule Editor</span>
        {!readOnly &&
          RULE_SNIPPETS.map((s) => (
            <button key={s.label} type="button" onClick={() => insertSnippet(s.content)}>
              Insert {s.label}
            </button>
          ))}
        <button
          type="button"
          onClick={() => onValidate?.(errors)}
          className={errors.length ? 'rules-editor__validate--error' : 'rules-editor__validate--ok'}
        >
          {errors.length ? `${errors.length} issue(s)` : 'Valid syntax'}
        </button>
      </div>
      {errors.length > 0 && (
        <ul className="rules-editor__errors">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <div className="rules-editor__body">
        <textarea
          className="rules-editor__code"
          value={doc.content}
          disabled={readOnly}
          spellCheck={false}
          onChange={(e) => handleChange(e.target.value)}
        />
        <div className="rules-editor__side">
          <h4>Test Harness</h4>
          <p className="rules-editor__hint">
            Enter a sample utterance to preview matching (compile to FST on build).
          </p>
          <input
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="e.g. yes please"
          />
          <div className="rules-editor__stats">
            <div>Lines: {lines}</div>
            <div>Has TopRule: {doc.content.includes('TopRule') ? 'Yes' : 'No'}</div>
          </div>
          <h4>Reference</h4>
          <pre className="rules-editor__ref">
            {`TopRule = $* (...rules...) $*;
rule = (word | phrase);
{%skill='name'%}  // launch tag`}
          </pre>
        </div>
      </div>
    </div>
  );
}

export { parseRule, serializeRule, createEmptyRule };
