/**
 * Jibo Studio ships fully offline, so Monaco must never phone home. By default
 * `@monaco-editor/react` lazily fetches the Monaco AMD loader + assets from a
 * CDN (jsdelivr) the first time an `<Editor>` mounts. Without network access
 * that fetch just hangs, and every Monaco-backed tab (including skill.jibo)
 * renders as a permanently blank pane with no error in the terminal.
 *
 * Point the loader at the `monaco-editor` package we already vendor, import its
 * CSS (required for the editor to paint), and wire up language workers via
 * Vite's native `?worker` imports so language services work offline too.
 */
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import 'monaco-editor/min/vs/editor/editor.main.css';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorker: (workerId: string, label: string) => Worker;
    };
  }
}

window.MonacoEnvironment = {
  getWorker(_workerId: string, label: string): Worker {
    switch (label) {
      case 'json':
        return new JsonWorker();
      case 'css':
      case 'scss':
      case 'less':
        return new CssWorker();
      case 'html':
      case 'handlebars':
      case 'razor':
        return new HtmlWorker();
      case 'typescript':
      case 'javascript':
        return new TsWorker();
      default:
        return new EditorWorker();
    }
  },
};

loader.config({ monaco });

export { monaco };
export type Monaco = typeof monaco;
