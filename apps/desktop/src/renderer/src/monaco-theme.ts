import type { Monaco } from '@monaco-editor/react';
import type { ThemeMode } from '../../../shared/types';

export const MONACO_THEME_DARK = 'jibo-dark';
export const MONACO_THEME_LIGHT = 'jibo-light';

let themesRegistered = false;

export function getMonacoTheme(theme: ThemeMode): string {
  return theme === 'light' ? MONACO_THEME_LIGHT : MONACO_THEME_DARK;
}

export function setupMonacoTheme(monaco: Monaco): void {
  if (themesRegistered) return;
  themesRegistered = true;

  monaco.editor.defineTheme(MONACO_THEME_DARK, {
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

  monaco.editor.defineTheme(MONACO_THEME_LIGHT, {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#ffffff',
      'editorGutter.background': '#ffffff',
      'editor.lineHighlightBackground': '#f3f3f3',
      'editorWidget.background': '#f3f3f3',
      'editorWidget.border': '#d4d4d4',
      'input.background': '#ffffff',
      'dropdown.background': '#ffffff',
      'sideBar.background': '#f3f3f3',
      'minimap.background': '#ffffff',
    },
  });
}
