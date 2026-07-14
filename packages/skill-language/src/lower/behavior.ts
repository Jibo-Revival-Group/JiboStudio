import type { BehaviorDecl, BehaviorNode } from '../ast';
import type { BehaviorDocument, BehaviorNode as ModelBehaviorNode } from '@jibo-studio/skill-model';
import { formatScript, stableId } from '../util';

export function lowerBehavior(behavior: BehaviorDecl, file: string): BehaviorDocument {
  const doc: BehaviorDocument = { meta: { version: 1 } };
  const rootId = 1;

  if (behavior.root.kind === 'sequence' || behavior.root.kind === 'selector') {
    const children: Array<string | number> = [];
    doc[String(rootId)] = {
      id: rootId,
      class: behavior.root.kind === 'sequence' ? 'Sequence' : 'Selector',
      name: 'Root',
      'asset-pack': 'core',
      children,
      decorators: [],
      options: {},
    };
    behavior.root.children.forEach((child, index) => {
      children.push(emitNode(child, rootId, index, file, behavior.name, doc));
    });
    return doc;
  }

  const children: Array<string | number> = [];
  doc[String(rootId)] = {
    id: rootId,
    class: 'Sequence',
    name: 'Root',
    'asset-pack': 'core',
    children,
    decorators: [],
    options: {},
  };
  children.push(emitNode(behavior.root, rootId, 0, file, behavior.name, doc));
  return doc;
}

function emitNode(
  node: BehaviorNode,
  parent: number | string,
  index: number,
  file: string,
  behaviorName: string,
  doc: BehaviorDocument,
): string | number {
  if (node.kind === 'sequence' || node.kind === 'selector') {
    const id = stableId([file, behaviorName, 'nested', String(index), node.kind]);
    const children: Array<string | number> = [];
    const model: ModelBehaviorNode = {
      id,
      class: node.kind === 'sequence' ? 'Sequence' : 'Selector',
      name: node.kind,
      'asset-pack': 'core',
      parent,
      children,
      decorators: [],
      options: {},
    };
    doc[id] = model;
    node.children.forEach((child, childIndex) => {
      children.push(emitNode(child, id, childIndex, file, behaviorName, doc));
    });
    return id;
  }

  const id = stableId([file, behaviorName, 'leaf', String(index), node.kind]);
  if (node.kind === 'play_audio') {
    doc[id] = {
      id,
      class: 'PlayAudio',
      name: 'Audio',
      'asset-pack': 'core',
      parent,
      options: { audioPath: node.path },
    };
    return id;
  }

  doc[id] = {
    id,
    class: 'ExecuteScript',
    name: 'Script',
    'asset-pack': 'core',
    parent,
    options: { exec: formatScript(node.source) },
  };
  return id;
}
