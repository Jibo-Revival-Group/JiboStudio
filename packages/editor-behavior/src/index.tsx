import { useMemo, useState } from 'react';
import {
  parseBehavior,
  serializeBehavior,
  getBehaviorRoot,
  BEHAVIOR_NODE_PALETTE,
  type BehaviorDocument,
  type BehaviorNode,
} from '@jibo-studio/skill-model';
import { v4 as uuidv4 } from 'uuid';
import './behavior-editor.css';

export interface BehaviorEditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

function collectNodes(doc: BehaviorDocument): BehaviorNode[] {
  return Object.entries(doc)
    .filter(([key]) => key !== 'meta')
    .map(([, v]) => v as BehaviorNode)
    .filter((n) => n && n.id !== undefined);
}

export function BehaviorEditor({ content, onChange, readOnly }: BehaviorEditorProps) {
  const doc = useMemo(() => parseBehavior(content), [content]);
  const nodes = useMemo(() => collectNodes(doc), [doc]);
  const root = useMemo(() => getBehaviorRoot(doc), [doc]);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);

  const selected = nodes.find((n) => n.id === selectedId);

  const updateNode = (id: string | number, patch: Partial<BehaviorNode>) => {
    const key = String(id);
    const existing = doc[key] as BehaviorNode;
    if (!existing) return;
    const next = {
      ...doc,
      [key]: { ...existing, ...patch },
    };
    onChange(serializeBehavior(next));
  };

  const addChild = (parentId: string | number, className: string) => {
    const childId = uuidv4();
    const parentKey = String(parentId);
    const parent = doc[parentKey] as BehaviorNode;
    if (!parent) return;

    const child: BehaviorNode = {
      id: childId,
      class: className,
      name: className,
      'asset-pack': 'core',
      parent: parentId,
      options: className === 'PlayAudio' ? { audioPath: 'FX_Bloop.mp3' } : {},
      children: className === 'Switch' ? [] : undefined,
      decorators: className === 'Case' ? undefined : [],
    };

    const next: BehaviorDocument = {
      ...doc,
      [childId]: child,
      [parentKey]: {
        ...parent,
        children: [...(parent.children ?? []), childId],
      },
    };
    onChange(serializeBehavior(next));
    setSelectedId(childId);
  };

  const renderTree = (nodeId: string | number, depth = 0): JSX.Element | null => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return null;
    const isSelected = selectedId === node.id;
    return (
      <div key={String(nodeId)} style={{ marginLeft: depth * 16 }}>
        <button
          type="button"
          className={`bt-tree-item ${isSelected ? 'selected' : ''}`}
          onClick={() => setSelectedId(node.id)}
        >
          <span className="bt-tree-item__class">{node.class}</span>
          {node.name && <span className="bt-tree-item__name">{node.name}</span>}
        </button>
        {(node.children ?? []).map((childId) => renderTree(childId, depth + 1))}
      </div>
    );
  };

  return (
    <div className="behavior-editor">
      <div className="behavior-editor__tree">
        <h4>Behavior Tree</h4>
        {root && renderTree(root.id)}
        {!readOnly && selected && (
          <div className="behavior-editor__add">
            <span>Add child:</span>
            {BEHAVIOR_NODE_PALETTE.filter((p) => p.class !== 'Case').map((item) => (
              <button
                key={item.class}
                type="button"
                onClick={() => addChild(selected.id, item.class)}
              >
                + {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="behavior-editor__props">
        <h4>Properties</h4>
        {selected ? (
          <>
            <label>
              Name
              <input
                value={selected.name ?? ''}
                disabled={readOnly}
                onChange={(e) => updateNode(selected.id, { name: e.target.value })}
              />
            </label>
            <label>
              Class
              <input value={selected.class} disabled />
            </label>
            {selected.options &&
              Object.entries(selected.options).map(([key, value]) => (
                <label key={key}>
                  {key}
                  <textarea
                    rows={4}
                    disabled={readOnly}
                    value={
                      Array.isArray(value) ? value.join('\n') : String(value ?? '')
                    }
                    onChange={(e) =>
                      updateNode(selected.id, {
                        options: {
                          ...selected.options,
                          [key]: e.target.value.includes('\n')
                            ? e.target.value.split('\n')
                            : e.target.value,
                        },
                      })
                    }
                  />
                </label>
              ))}
          </>
        ) : (
          <p className="behavior-editor__hint">Select a node in the tree.</p>
        )}
      </div>
    </div>
  );
}

export { parseBehavior, serializeBehavior };
