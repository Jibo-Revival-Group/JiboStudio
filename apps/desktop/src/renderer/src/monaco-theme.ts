import type { Monaco } from '@monaco-editor/react';

export const MONACO_THEME = 'jibo-dark';

export function setupMonacoTheme(monaco: Monaco): void {
  monaco.editor.defineTheme(MONACO_THEME, {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#121212',
      'editorGutter.background': '#121212',
      'editor.lineHighlightBackground': '#1a1a1a',
      'editorWidget.background': '#181818',
      'editorWidget.border': '#2a2a2a',
      'input.background': '#0f0f0f',
      'dropdown.background': '#181818',
      'sideBar.background': '#181818',
      'minimap.background': '#121212',
    },
  });
}
