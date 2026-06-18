import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FileEntry } from '../../../shared/types';
import { ExpandIcon, FileTypeIcon, FolderIcon, MaterialIcon } from './icons';
import './explorer.css';

const INDENT_PX = 16;
const BASE_PADDING_PX = 8;

interface FileExplorerProps {
  files: FileEntry[];
  projectPath: string | null;
  selectedPath: string | null;
  onOpenFile: (path: string) => void;
  onOpenProject: () => void;
  onNewSkill: () => void;
}

function collectDefaultExpanded(entries: FileEntry[], maxDepth = 1, depth = 0): Set<string> {
  const expanded = new Set<string>();
  if (depth > maxDepth) return expanded;
  for (const entry of entries) {
    if (entry.type === 'directory') {
      expanded.add(entry.path);
      if (entry.children) {
        for (const path of collectDefaultExpanded(entry.children, maxDepth, depth + 1)) {
          expanded.add(path);
        }
      }
    }
  }
  return expanded;
}

function getAncestorPaths(filePath: string, rootPath: string): string[] {
  if (!filePath.startsWith(rootPath)) return [];
  let dir = filePath.includes('/') ? filePath.slice(0, filePath.lastIndexOf('/')) : '';
  const ancestors: string[] = [];
  while (dir.length >= rootPath.length && dir !== rootPath) {
    ancestors.push(dir);
    dir = dir.slice(0, dir.lastIndexOf('/'));
  }
  return ancestors;
}

function FileTreeNode({
  entry,
  depth,
  expandedPaths,
  selectedPath,
  onToggle,
  onOpenFile,
}: {
  entry: FileEntry;
  depth: number;
  expandedPaths: Set<string>;
  selectedPath: string | null;
  onToggle: (path: string) => void;
  onOpenFile: (path: string) => void;
}) {
  const isExpanded = expandedPaths.has(entry.path);
  const isSelected = entry.type === 'file' && entry.path === selectedPath;
  const paddingLeft = BASE_PADDING_PX + depth * INDENT_PX;

  if (entry.type === 'directory') {
    const isEmpty = !entry.children?.length;
    return (
      <div className="explorer-node">
        <button
          type="button"
          className="explorer-row explorer-row--folder"
          style={{ paddingLeft }}
          onClick={() => onToggle(entry.path)}
          aria-expanded={isExpanded}
        >
          <span className="explorer-row__chevron">
            {isEmpty ? null : <ExpandIcon expanded={isExpanded} />}
          </span>
          <span className="explorer-row__icon">
            <FolderIcon open={isExpanded && !isEmpty} />
          </span>
          <span className="explorer-row__label">{entry.name}</span>
        </button>
        {isExpanded &&
          entry.children?.map((child) => (
            <FileTreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              selectedPath={selectedPath}
              onToggle={onToggle}
              onOpenFile={onOpenFile}
            />
          ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`explorer-row explorer-row--file${isSelected ? ' explorer-row--selected' : ''}`}
      style={{ paddingLeft }}
      onClick={() => onOpenFile(entry.path)}
      aria-current={isSelected ? 'true' : undefined}
    >
      <span className="explorer-row__chevron" aria-hidden />
      <span className="explorer-row__icon">
        <FileTypeIcon name={entry.name} />
      </span>
      <span className="explorer-row__label">{entry.name}</span>
    </button>
  );
}

export function FileExplorer({
  files,
  projectPath,
  selectedPath,
  onOpenFile,
  onOpenProject,
  onNewSkill,
}: FileExplorerProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set());
  const [rootExpanded,  setRootExpanded] = useState(true);
  const [expandedSeedKey, setExpandedSeedKey] = useState<string | null>(null);

  const projectName = projectPath?.split('/').pop() ?? '';

  useEffect(() => {
    if (!projectPath) {
      setExpandedPaths(new Set());
      setExpandedSeedKey(null);
      setRootExpanded(true);
      return;
    }
    if (expandedSeedKey !== projectPath && files.length > 0) {
      setExpandedPaths(collectDefaultExpanded(files));
      setExpandedSeedKey(projectPath);
      setRootExpanded(true);
    }
  }, [projectPath, files, expandedSeedKey]);

  useEffect(() => {
    if (!projectPath || !selectedPath) return;
    const ancestors = getAncestorPaths(selectedPath, projectPath);
    if (ancestors.length === 0) return;
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      for (const path of ancestors) {
        next.add(path);
      }
      return next;
    });
    setRootExpanded(true);
  }, [projectPath, selectedPath]);

  const toggleExpanded = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const visibleFiles = useMemo(
    () => (rootExpanded ? files : []),
    [files, rootExpanded],
  );

  return (
    <div className="explorer">
      <div className="explorer__header">Explorer</div>
      <div className="explorer__actions">
        <button type="button" className="explorer__action" onClick={onOpenProject}>
          <MaterialIcon name="folder_open" size={16} />
          <span>Open Project</span>
        </button>
        <button type="button" className="explorer__action" onClick={onNewSkill}>
          <MaterialIcon name="add_circle" size={16} />
          <span>New Skill</span>
        </button>
      </div>
      {!projectPath ? (
        <p className="explorer__empty">Open a skill project or create a new one.</p>
      ) : (
        <div className="explorer__tree">
          <button
            type="button"
            className="explorer-row explorer-row--root"
            onClick={() => setRootExpanded(!rootExpanded)}
            aria-expanded={rootExpanded}
          >
            <span className="explorer-row__chevron">
              <ExpandIcon expanded={rootExpanded} />
            </span>
            <span className="explorer-row__icon">
              <FolderIcon open={rootExpanded} />
            </span>
            <span className="explorer-row__label explorer-row__label--root">{projectName}</span>
          </button>
          {visibleFiles.map((entry) => (
            <FileTreeNode
              key={entry.path}
              entry={entry}
              depth={1}
              expandedPaths={expandedPaths}
              selectedPath={selectedPath}
              onToggle={toggleExpanded}
              onOpenFile={onOpenFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
