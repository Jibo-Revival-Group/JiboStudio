import { useEffect, useRef, useState } from 'react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { monaco, type Monaco } from '../monaco-setup';
import { getMonacoTheme, setupMonacoTheme } from '../monaco-theme';
import type { ThemeMode } from '../../../shared/types';
import './offline-monaco.css';

export interface OfflineMonacoEditorProps {
  path: string;
  content: string;
  language: string;
  theme: ThemeMode;
  readOnly?: boolean;
  options?: MonacoEditor.IStandaloneEditorConstructionOptions;
  onChange: (content: string) => void;
  onMount?: (editor: MonacoEditor.IStandaloneCodeEditor, monacoApi: Monaco) => void;
}

/**
 * Direct monaco-editor mount for Electron. Avoids @monaco-editor/react's async
 * loader (CDN by default) so the editor always paints offline.
 */
export function OfflineMonacoEditor({
  path,
  content,
  language,
  theme,
  readOnly,
  options,
  onChange,
  onMount,
}: OfflineMonacoEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const contentRef = useRef(content);
  const languageRef = useRef(language);
  const themeRef = useRef(theme);
  const readOnlyRef = useRef(readOnly);
  const optionsRef = useRef(options);
  const onChangeRef = useRef(onChange);
  const onMountRef = useRef(onMount);
  const [error, setError] = useState<string | null>(null);
  // Use Uri.file so absolute Unix paths (/home/...) become file:///home/...
  // rather than the invalid file:////home/... from string concatenation.
  const modelUriKey = monaco.Uri.file(path).toString();

  contentRef.current = content;
  languageRef.current = language;
  themeRef.current = theme;
  readOnlyRef.current = readOnly;
  optionsRef.current = options;
  onChangeRef.current = onChange;
  onMountRef.current = onMount;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let editor: MonacoEditor.IStandaloneCodeEditor | null = null;
    let subscription: { dispose: () => void } | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const mountEditor = (): boolean => {
      if (cancelled || editor) return true;
      const { width, height } = host.getBoundingClientRect();
      // Golden Layout often mounts panels at 0×0 for a frame; wait for size.
      if (width < 2 || height < 2) return false;

      try {
        setupMonacoTheme(monaco);
        const uri = monaco.Uri.file(path);
        let model = monaco.editor.getModel(uri);
        if (!model) {
          model = monaco.editor.createModel(
            contentRef.current,
            languageRef.current,
            uri,
          );
        } else {
          if (model.getValue() !== contentRef.current) {
            model.setValue(contentRef.current);
          }
          monaco.editor.setModelLanguage(model, languageRef.current);
        }

        editor = monaco.editor.create(host, {
          model,
          theme: getMonacoTheme(themeRef.current),
          readOnly: !!readOnlyRef.current,
          minimap: { enabled: false },
          fontSize: 13,
          wordWrap: 'on',
          automaticLayout: true,
          tabSize: 2,
          renderValidationDecorations: 'on',
          ...optionsRef.current,
        });
        editorRef.current = editor;
        setError(null);

        subscription = editor.onDidChangeModelContent(() => {
          onChangeRef.current(editor?.getValue() ?? '');
        });

        onMountRef.current?.(editor, monaco);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Monaco editor failed to mount', err);
        setError(message);
      }
      return true;
    };

    if (!mountEditor()) {
      resizeObserver = new ResizeObserver(() => {
        if (mountEditor()) {
          resizeObserver?.disconnect();
          resizeObserver = null;
        }
      });
      resizeObserver.observe(host);
    }

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      subscription?.dispose();
      editor?.dispose();
      if (editorRef.current === editor) editorRef.current = null;
    };
  }, [modelUriKey, path]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;
    if (model.getValue() !== content) {
      const position = editor.getPosition();
      model.setValue(content);
      if (position) editor.setPosition(position);
    }
  }, [content]);

  useEffect(() => {
    monaco.editor.setTheme(getMonacoTheme(theme));
  }, [theme]);

  useEffect(() => {
    editorRef.current?.updateOptions({ readOnly: !!readOnly, ...options });
  }, [readOnly, options]);

  useEffect(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (model) monaco.editor.setModelLanguage(model, language);
  }, [language]);

  return (
    <div className={`offline-monaco${error ? ' offline-monaco--fallback' : ''}`}>
      {/* Host stays mounted so Monaco can wait for Golden Layout to size the panel. */}
      <div
        ref={hostRef}
        className="offline-monaco__host"
        hidden={!!error}
        aria-hidden={!!error}
      />
      {error ? (
        <>
          <div className="offline-monaco__error" role="alert">
            Editor failed to load ({error}). Using plain text fallback.
          </div>
          <textarea
            className="offline-monaco__textarea"
            value={content}
            readOnly={readOnly}
            spellCheck={false}
            onChange={(e) => onChange(e.target.value)}
          />
        </>
      ) : null}
    </div>
  );
}
