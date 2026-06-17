import { useState } from 'react';
import type { FileEntry } from '../../../shared/types';
import { ExpandIcon, FileTypeIcon } from './icons';
import './explorer.css';

interface FileExplorerProps {
  files: FileEntry[];
  projectPath: string | null;
  onOpenFile: (path: string) => void;
  onOpenProject: () => void;
  onNewSkill: () => void;
}

function FileTreeNode({
  entry,
  depth,
  onOpenFile,
}: {
  entry: FileEntry;
  depth: number;
  onOpenFile: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (entry.type === 'directory') {
    return (
      <div className="explorer-node">
        <button
          type="button"
          className="explorer-folder icon-inline icon-inline--file"
          style={{ paddingLeft: depth * 12 + 8 }}
          onClick={() => setExpanded(!expanded)}
        >
          <ExpandIcon expanded={expanded} />
          <span>{entry.name}</span>
        </button>
        {expanded &&
          entry.children?.map((child) => (
            <FileTreeNode key={child.path} entry={child} depth={depth + 1} onOpenFile={onOpenFile} />
          ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="explorer-file icon-inline icon-inline--file"
      style={{ paddingLeft: depth * 12 + 20 }}
      onClick={() => onOpenFile(entry.path)}
    >
      <FileTypeIcon name={entry.name} />
      <span>{entry.name}</span>
    </button>
  );
}

export function FileExplorer({
  files,
  projectPath,
  onOpenFile,
  onOpenProject,
  onNewSkill,
}: FileExplorerProps) {
  return (
    <div className="explorer">
      <div className="explorer__actions">
        <button type="button" onClick={onOpenProject}>
          Open Project
        </button>
        <button type="button" onClick={onNewSkill}>
          New Skill
        </button>
      </div>
      {!projectPath ? (
        <p className="explorer__empty">Open a skill project or create a new one.</p>
      ) : (
        <div className="explorer__tree">
          <div className="explorer__root">{projectPath.split('/').pop()}</div>
          {files.map((entry) => (
            <FileTreeNode key={entry.path} entry={entry} depth={0} onOpenFile={onOpenFile} />
          ))}
        </div>
      )}
    </div>
  );
}
