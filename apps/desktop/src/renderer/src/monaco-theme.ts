import type { Monaco } from '@monaco-editor/react';
import type { ThemeMode } from '../../../shared/types';

export const MONACO_THEME_DARK = 'jibo-dark';
export const MONACO_THEME_DEEP_DARK = 'jibo-deep-dark';
export const MONACO_THEME_LIGHT = 'jibo-light';

let themesRegistered = false;

export function getMonacoTheme(theme: ThemeMode): string {
  if (theme === 'light') return MONACO_THEME_LIGHT;
  if (theme === 'deep-dark') return MONACO_THEME_DEEP_DARK;
  return MONACO_THEME_DARK;
}

export function setupMonacoTheme(monaco: Monaco): void {
  if (themesRegistered) return;
  themesRegistered = true;

  monaco.editor.defineTheme(MONACO_THEME_DARK, {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#1e1e1e',
      'editorGutter.background': '#1e1e1e',
      'editor.lineHighlightBackground': '#2a2d2e',
      'editorWidget.background': '#252526',
      'editorWidget.border': '#3c3c3c',
      'input.background': '#3c3c3c',
      'dropdown.background': '#252526',
      'sideBar.background': '#252526',
      'minimap.background': '#1e1e1e',
    },
  });

  monaco.editor.defineTheme(MONACO_THEME_DEEP_DARK, {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#0a0a0a',
      'editorGutter.background': '#0a0a0a',
      'editor.lineHighlightBackground': '#141414',
      'editorWidget.background': '#111111',
      'editorWidget.border': '#222222',
      'input.background': '#080808',
      'dropdown.background': '#111111',
      'sideBar.background': '#111111',
      'minimap.background': '#0a0a0a',
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
