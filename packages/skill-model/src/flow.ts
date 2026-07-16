import { v4 as uuidv4 } from 'uuid';

export interface FlowNode {
  class: string;
  clazz?: string;
  loc?: string;
  id: string;
  options?: Record<string, unknown>;
  name?: string;
  size?: string;
  'asset-pack'?: string;
}

export interface FlowLink {
  from: string;
  to: string;
  fromPort?: string;
  toPort?: string;
  text?: string;
}

export interface FlowDocument {
  class: 'go.GraphLinksModel';
  dataFormat: 'flow-1';
  nodeKeyProperty: 'id';
  nodeCategoryProperty: 'class';
  linkFromPortIdProperty: 'fromPort';
  linkToPortIdProperty: 'toPort';
  nodeDataArray: FlowNode[];
  linkDataArray: FlowLink[];
}

export function createEmptyFlow(): FlowDocument {
  return {
    class: 'go.GraphLinksModel',
    dataFormat: 'flow-1',
    nodeKeyProperty: 'id',
    nodeCategoryProperty: 'class',
    linkFromPortIdProperty: 'fromPort',
    linkToPortIdProperty: 'toPort',
    nodeDataArray: [
      {
        class: 'Flow.Begin',
        clazz: 'Flow.Begin',
        loc: '200 100',
        id: uuidv4(),
        options: { inputParameters: ['()=>{ return {}; }'] },
        name: '',
      },
      {
        class: 'Flow.End',
        clazz: 'Flow.End',
        loc: '200 300',
        id: uuidv4(),
        options: { getTransition: ['() => { return ; }'] },
        name: '',
      },
    ],
    linkDataArray: [],
  };
}

export function parseFlow(content: string): FlowDocument {
  return JSON.parse(content) as FlowDocument;
}

export function serializeFlow(doc: FlowDocument): string {
  return JSON.stringify(doc, null, 4);
}

export const FLOW_NODE_PALETTE = [
  { class: 'Flow.Begin', label: 'Begin', category: 'Flow' },
  { class: 'Flow.End', label: 'End', category: 'Flow' },
  { class: 'Flow.Eval', label: 'Eval Script', category: 'Flow' },
  { class: 'Mim.Announcement', label: 'MIM Announcement', category: 'MIM' },
  { class: 'PlayAnimation', label: 'Play Animation', category: 'Core' },
  // Runtime class is 'Flow.Subflow' (not 'Flow.CallSubflow' — that string
  // isn't a real activity and jibo-dev's Flowify would silently no-op it).
  { class: 'Flow.Subflow', label: 'Call Subflow', category: 'Flow' },
  // Runtime class is the bare 'Subtree' (not 'Flow.Subtree') — see
  // jibo-dev's Flowify.transform, which only rewrites node.class === 'Subtree'.
  { class: 'Subtree', label: 'Run Behavior', category: 'Flow' },
] as const;
