import Editor, { type OnMount } from '@monaco-editor/react';
import { useEffect, useRef } from 'react';
import type { editor as MonacoEditor, IDisposable } from 'monaco-editor';
import type { SourceDiagnostic, ThemeMode } from '../../../shared/types';
import { getMonacoTheme, setupMonacoTheme } from '../monaco-theme';

interface JiboScriptEditorProps {
  path: string;
  content: string;
  theme: ThemeMode;
  diagnostics?: SourceDiagnostic[];
  readOnly?: boolean;
  onChange: (content: string) => void;
}

let languageRegistered = false;

function ensureJiboLanguage(monaco: typeof import('monaco-editor')): void {
  if (languageRegistered) return;
  languageRegistered = true;
  monaco.languages.register({ id: 'jiboscript' });
  monaco.languages.setMonarchTokensProvider('jiboscript', {
    keywords: [
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
      'end',
      'with',
      'say',
      'type',
      'sequence',
      'selector',
      'play_audio',
      'script',
      'match',
    ],
    tokenizer: {
      root: [
        [/#.*$/, 'comment'],
        [/"""/, { token: 'string', next: '@triplestring' }],
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/'([^'\\]|\\.)*$/, 'string.invalid'],
        [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
        [/'/, { token: 'string.quote', bracket: '@open', next: '@stringSingle' }],
        [/[a-zA-Z_]\w*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
        [/\d+(\.\d+)?/, 'number'],
        [/[{}()\[\]]/, '@brackets'],
        [/[:=,.]/, 'delimiter'],
      ],
      string: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }],
      ],
      stringSingle: [
        [/[^\\']+/, 'string'],
        [/\\./, 'string.escape'],
        [/'/, { token: 'string.quote', bracket: '@close', next: '@pop' }],
      ],
      triplestring: [
        [/"""/, { token: 'string', next: '@pop' }],
        [/./, 'string'],
      ],
    },
  });
  monaco.languages.setLanguageConfiguration('jiboscript', {
    comments: { lineComment: '#' },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  });
}

export function JiboScriptEditor({
  path,
  content,
  theme,
  diagnostics = [],
  readOnly,
  onChange,
}: JiboScriptEditorProps) {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const modelPath = `file:///${path.replace(/\\/g, '/')}`;

  const handleMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;
    ensureJiboLanguage(monaco);
    applyMarkers(monaco, ed, diagnostics);
  };

  useEffect(() => {
    const monaco = monacoRef.current;
    const ed = editorRef.current;
    if (monaco && ed) applyMarkers(monaco, ed, diagnostics);
  }, [diagnostics]);

  return (
    <Editor
      height="100%"
      theme={getMonacoTheme(theme)}
      language="jiboscript"
      path={modelPath}
      value={content}
      onChange={(value) => onChange(value ?? '')}
      beforeMount={(monaco) => {
        setupMonacoTheme(monaco);
        ensureJiboLanguage(monaco);
      }}
      onMount={handleMount}
      options={{
        readOnly: !!readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        wordWrap: 'on',
        automaticLayout: true,
        tabSize: 2,
        renderValidationDecorations: 'on',
      }}
    />
  );
}

function applyMarkers(
  monaco: typeof import('monaco-editor'),
  ed: MonacoEditor.IStandaloneCodeEditor,
  diagnostics: SourceDiagnostic[],
): void {
  const model = ed.getModel();
  if (!model) return;
  monaco.editor.setModelMarkers(
    model,
    'jiboscript',
    diagnostics.map((d) => ({
      startLineNumber: d.startLine,
      startColumn: d.startColumn,
      endLineNumber: d.endLine,
      endColumn: Math.max(d.endColumn, d.startColumn + 1),
      message: d.message,
      severity:
        d.severity === 'error'
          ? monaco.MarkerSeverity.Error
          : d.severity === 'warning'
            ? monaco.MarkerSeverity.Warning
            : monaco.MarkerSeverity.Info,
    })),
  );
}

// Keep TypeScript happy when tree-shaking removes unused imports in some builds.
void (null as unknown as IDisposable);
