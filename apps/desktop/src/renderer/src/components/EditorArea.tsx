import type { OpenTab } from '../App';
import { JiboIcon } from './icons';
import { GoldenLayoutEditor } from './GoldenLayoutEditor';
import './editor-area.css';

interface EditorAreaProps {
  tabs: OpenTab[];
  activeTab: string | null;
  activeTabData: OpenTab | null;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  onChangeContent: (path: string, content: string) => void;
  onSave: () => void;
  onBuild: () => void;
  hasProject: boolean;
  onOpenProject: () => void;
  onNewSkill: () => void;
}

export function EditorArea({
  tabs,
  activeTab,
  activeTabData,
  onSelectTab,
  onCloseTab,
  onChangeContent,
  onSave,
  onBuild,
  hasProject,
  onOpenProject,
  onNewSkill,
}: EditorAreaProps) {
  return (
    <div className="editor-area">
      {hasProject ? (
        <div className="editor-toolbar">
          <button type="button" onClick={onSave} disabled={!activeTabData?.dirty}>
            Save
          </button>
          <button type="button" onClick={onBuild}>
            Build
          </button>
        </div>
      ) : null}
      <GoldenLayoutEditor
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
        onChangeContent={onChangeContent}
        hidden={!hasProject}
      />
      {!hasProject ? (
        <div className="editor-welcome">
          <div className="editor-welcome__brand">
            <JiboIcon size={48} title="Jibo" />
            <h1>Jibo Studio</h1>
          </div>
          <p>Create on-robot Jibo skills with visual editors for Flow, Behavior, MIM, and Rules.</p>
          <div className="editor-welcome__actions">
            <button type="button" onClick={onNewSkill}>
              New Skill
            </button>
            <button type="button" onClick={onOpenProject}>
              Open Project
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
