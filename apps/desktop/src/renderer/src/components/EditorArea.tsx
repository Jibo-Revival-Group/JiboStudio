import type { OpenTab } from '../App';
import type { SourceDiagnostic } from '../../../shared/types';
import { StudioLogo } from './icons';
import { GoldenLayoutEditor } from './GoldenLayoutEditor';
import './editor-area.css';

interface EditorAreaProps {
  tabs: OpenTab[];
  activeTab: string | null;
  activeTabData: OpenTab | null;
  onSelectTab: (path: string | null) => void;
  onCloseTab: (path: string) => void;
  onChangeContent: (path: string, content: string) => void;
  diagnosticsByPath?: Record<string, SourceDiagnostic[]>;
  onSave: () => void;
  onBuild: () => void;
  onToggleWatch: () => void;
  watching: boolean;
  building: boolean;
  hasProject: boolean;
  projectModeLabel: string | null;
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
  diagnosticsByPath = {},
  onSave,
  onBuild,
  onToggleWatch,
  watching,
  building,
  hasProject,
  projectModeLabel,
  onOpenProject,
  onNewSkill,
}: EditorAreaProps) {
  return (
    <div className="editor-area">
      {hasProject ? (
        <div className="editor-toolbar">
          {projectModeLabel ? <span className="editor-toolbar__mode">{projectModeLabel}</span> : null}
          <button
            type="button"
            className="editor-toolbar__btn editor-toolbar__btn--primary"
            onClick={onSave}
            disabled={!activeTabData?.dirty || activeTabData.generated}
          >
            Save
          </button>
          <button
            type="button"
            className="editor-toolbar__btn editor-toolbar__btn--secondary"
            onClick={onBuild}
            disabled={building}
          >
            {building ? 'Building…' : 'Build'}
          </button>
          <button
            type="button"
            className={`editor-toolbar__btn ${watching ? 'editor-toolbar__btn--active' : 'editor-toolbar__btn--secondary'}`}
            onClick={onToggleWatch}
            disabled={building}
          >
            {watching ? 'Stop Watch' : 'Watch'}
          </button>
        </div>
      ) : null}
      <GoldenLayoutEditor
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
        onChangeContent={onChangeContent}
        diagnosticsByPath={diagnosticsByPath}
        hidden={!hasProject}
      />
      {!hasProject ? (
        <div className="editor-welcome">
          <div className="editor-welcome__brand">
            <StudioLogo size={72} title="Jibo Studio" />
            <h1>Jibo Studio</h1>
          </div>
          <p>
            Write Jibo skills in JiboScript — a Python-like language that compiles to the legacy
            Flow, Behavior, MIM, and Rules formats Jibo runs on-robot.
          </p>
          <div className="editor-welcome__actions">
            <button type="button" className="editor-welcome__btn editor-welcome__btn--primary" onClick={onNewSkill}>
              New Skill
            </button>
            <button type="button" className="editor-welcome__btn editor-welcome__btn--secondary" onClick={onOpenProject}>
              Open Project
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
