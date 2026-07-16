import { useEffect, useRef } from 'react';
import type { editor as MonacoEditor } from 'monaco-editor';
import type { SourceDiagnostic, ThemeMode } from '../../../shared/types';
import { monaco, type Monaco } from '../monaco-setup';
import { OfflineMonacoEditor } from './OfflineMonacoEditor';

interface JiboScriptEditorProps {
  path: string;
  content: string;
  theme: ThemeMode;
  diagnostics?: SourceDiagnostic[];
  readOnly?: boolean;
  onChange: (content: string) => void;
}

let languageRegistered = false;

function ensureJiboLanguage(monacoApi: Monaco): void {
  if (languageRegistered) return;
  languageRegistered = true;
  monacoApi.languages.register({ id: 'jiboscript' });
  monacoApi.languages.setMonarchTokensProvider('jiboscript', {
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
  monacoApi.languages.setLanguageConfiguration('jiboscript', {
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

function applyMarkers(
  monacoApi: Monaco,
  ed: MonacoEditor.IStandaloneCodeEditor,
  diagnostics: SourceDiagnostic[],
): void {
  const model = ed.getModel();
  if (!model) return;
  monacoApi.editor.setModelMarkers(
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
          ? monacoApi.MarkerSeverity.Error
          : d.severity === 'warning'
            ? monacoApi.MarkerSeverity.Warning
            : monacoApi.MarkerSeverity.Info,
    })),
  );
}

// Register before any OfflineMonacoEditor creates a jiboscript model.
ensureJiboLanguage(monaco);

export function JiboScriptEditor({
  path,
  content,
  theme,
  diagnostics = [],
  readOnly,
  onChange,
}: JiboScriptEditorProps) {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  useEffect(() => {
    const monacoApi = monacoRef.current;
    const ed = editorRef.current;
    if (monacoApi && ed) applyMarkers(monacoApi, ed, diagnostics);
  }, [diagnostics]);

  return (
    <OfflineMonacoEditor
      path={path}
      content={content}
      language="jiboscript"
      theme={theme}
      readOnly={readOnly}
      onChange={onChange}
      onMount={(ed, monacoApi) => {
        editorRef.current = ed;
        monacoRef.current = monacoApi;
        applyMarkers(monacoApi, ed, diagnostics);
      }}
    />
  );
}
