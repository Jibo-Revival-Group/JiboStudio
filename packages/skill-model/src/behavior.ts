import { v4 as uuidv4 } from 'uuid';

export interface BehaviorNode {
  id: number | string;
  class: string;
  name?: string;
  'asset-pack'?: string;
  parent?: number | string;
  children?: Array<number | string>;
  decorators?: string[];
  options?: Record<string, unknown>;
}

export interface BehaviorDocument {
  meta: { version: number };
  [key: string]: BehaviorNode | { version: number } | undefined;
}

export function createEmptyBehavior(): BehaviorDocument {
  const rootId = 1;
  const childId = uuidv4();
  return {
    meta: { version: 1 },
    [String(rootId)]: {
      id: rootId,
      class: 'Sequence',
      name: 'Root',
      'asset-pack': 'core',
      children: [childId],
      decorators: [],
      options: {},
    },
    [childId]: {
      id: childId,
      class: 'ExecuteScript',
      name: 'Init',
      'asset-pack': 'core',
      parent: rootId,
      options: {
        exec: ['() => {', '  // behavior init', '}'],
      },
    },
  };
}

export function parseBehavior(content: string): BehaviorDocument {
  return JSON.parse(content) as BehaviorDocument;
}

export function serializeBehavior(doc: BehaviorDocument): string {
  return JSON.stringify(doc, null, 4);
}

export function getBehaviorRoot(doc: BehaviorDocument): BehaviorNode | undefined {
  for (const [key, value] of Object.entries(doc)) {
    if (key === 'meta') continue;
    const node = value as BehaviorNode;
    // The root node is whichever top-level entry has no parent — it may be any
    // composite class (Sequence, Switch, Parallel, Random), not just Sequence.
    if (node && typeof node.id === 'number' && node.parent === undefined) {
      return node;
    }
  }
  return undefined;
}

export const BEHAVIOR_NODE_PALETTE = [
  { class: 'Sequence', label: 'Sequence' },
  { class: 'Switch', label: 'Switch' },
  { class: 'ExecuteScript', label: 'Execute Script' },
  { class: 'PlayAudio', label: 'Play Audio' },
  { class: 'Case', label: 'Case (decorator)' },
] as const;
