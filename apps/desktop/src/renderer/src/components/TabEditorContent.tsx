import { FlowEditor } from '@jibo-studio/editor-flow';
import { BehaviorEditor } from '@jibo-studio/editor-behavior';
import { MimEditor } from '@jibo-studio/editor-mim';
import { RulesEditor } from '@jibo-studio/editor-rules';
import type { OpenTab } from '../App';
import type { SourceDiagnostic, ThemeMode } from '../../../shared/types';
import { JiboScriptEditor } from './JiboScriptEditor';
import { OfflineMonacoEditor } from './OfflineMonacoEditor';

interface TabEditorContentProps {
  tab: OpenTab;
  theme: ThemeMode;
  diagnostics?: SourceDiagnostic[];
  onChange: (content: string) => void;
}

export function TabEditorContent({ tab, theme, diagnostics = [], onChange }: TabEditorContentProps) {
  const legacyBanner = tab.generated ? (
    <div className="legacy-banner" role="status">
      Legacy generated artifact — edit <code>skill.jibo</code> instead.
    </div>
  ) : tab.editorType !== 'jibo' && tab.editorType !== 'monaco' ? (
    <div className="legacy-banner legacy-banner--editable" role="status">
      Legacy visual editor
    </div>
  ) : null;

  const body = (() => {
    switch (tab.editorType) {
      case 'jibo':
        return (
          <JiboScriptEditor
            path={tab.path}
            content={tab.content}
            theme={theme}
            diagnostics={diagnostics}
            onChange={onChange}
          />
        );
      case 'flow':
        return <FlowEditor content={tab.content} onChange={onChange} readOnly={tab.generated} />;
      case 'behavior':
        return <BehaviorEditor content={tab.content} onChange={onChange} readOnly={tab.generated} />;
      case 'mim':
        return <MimEditor content={tab.content} onChange={onChange} readOnly={tab.generated} />;
      case 'rule':
        return <RulesEditor content={tab.content} onChange={onChange} readOnly={tab.generated} />;
      default:
        return (
          <OfflineMonacoEditor
            path={tab.path}
            content={tab.content}
            language={getMonacoLanguage(tab.name)}
            theme={theme}
            onChange={onChange}
          />
        );
    }
  })();

  return (
    <div className="tab-editor-content">
      {legacyBanner}
      <div className="tab-editor-content__body">{body}</div>
    </div>
  );
}

function getMonacoLanguage(name: string): string {
  if (name.endsWith('.ts')) return 'typescript';
  if (name.endsWith('.json')) return 'json';
  if (name.endsWith('.html')) return 'html';
  if (name.endsWith('.jibo')) return 'jiboscript';
  if (name.endsWith('.rule')) return 'plaintext';
  return 'plaintext';
}
