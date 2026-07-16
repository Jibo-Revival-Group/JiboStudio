import type { FlowDecl } from '../ast';
import {
  type FlowDocument,
  type FlowLink,
  type FlowNode,
} from '@jibo-studio/skill-model';
import { formatScript, objectLiteralFromBindings, stableId } from '../util';

export function lowerFlow(flow: FlowDecl, file: string): FlowDocument {
  const nodes: FlowNode[] = [];
  const links: FlowLink[] = [];

  const beginId = stableId([file, flow.name, 'begin']);
  nodes.push({
    class: 'Flow.Begin',
    clazz: 'Flow.Begin',
    loc: '200 80',
    id: beginId,
    options: { inputParameters: ['()=>{ return {}; }'] },
    name: 'Begin',
  });

  let prevId = beginId;
  let y = 200;
  let stepIndex = 0;

  const ensureEnd = (fromId: string) => {
    const endId = stableId([file, flow.name, 'end']);
    if (!nodes.some((n) => n.id === endId)) {
      nodes.push({
        class: 'Flow.End',
        clazz: 'Flow.End',
        loc: `200 ${y}`,
        id: endId,
        options: { getTransition: ['() => { return ; }'] },
        name: '',
      });
    }
    links.push({ from: fromId, to: endId, fromPort: '', toPort: '' });
    return endId;
  };

  let sawEnd = false;
  for (const step of flow.steps) {
    if (step.kind === 'end') {
      ensureEnd(prevId);
      sawEnd = true;
      break;
    }

    const id = stableId([file, flow.name, String(stepIndex), step.kind]);
    stepIndex += 1;

    if (step.kind === 'subflow') {
      const bindings = Object.keys(step.inputs).length
        ? objectLiteralFromBindings(step.inputs)
        : '{ notepad: notepad }';
      nodes.push({
        class: 'Flow.Subflow',
        clazz: 'Flow.Subflow',
        loc: `200 ${y}`,
        id,
        options: {
          subflowId: `./${step.name}`,
          inputParameters: formatScript(`() => { return ${bindings}; }`),
          getTransition: ['(r) => { return r.transition; }'],
        },
        name: step.name,
      });
    } else if (step.kind === 'announce' || step.kind === 'query') {
      const dataExpr = Object.keys(step.data).length
        ? objectLiteralFromBindings(step.data)
        : '{}';
      nodes.push({
        class: step.kind === 'query' ? 'Mim.Question' : 'Mim.Announcement',
        clazz: step.kind === 'query' ? 'Mim.Question' : 'Mim.Announcement',
        loc: `200 ${y}`,
        id,
        options: {
          mimPath: `mims/${step.mim}.mim`,
          getPromptData: formatScript(`() => { return ${dataExpr}; }`),
        },
        name: step.mim,
      });
    } else if (step.kind === 'eval') {
      nodes.push({
        class: 'Flow.Eval',
        clazz: 'Flow.Eval',
        loc: `200 ${y}`,
        id,
        options: {
          exec: formatScript(step.source),
        },
        name: 'Eval',
      });
    } else if (step.kind === 'animation') {
      nodes.push({
        class: 'PlayAnimation',
        clazz: 'PlayAnimation',
        loc: `200 ${y}`,
        id,
        options: {
          animName: step.name,
        },
        name: step.name,
      });
    } else if (step.kind === 'behavior') {
      // Runtime class is the bare 'Subtree' (not 'Flow.Subtree' — that's only
      // the editor/schema key). jibo-dev's Flowify transform matches on
      // node.class === 'Subtree' to wrap behaviorPath in a require() call, the
      // same way it wraps Flow.Subflow's subflowId.
      nodes.push({
        class: 'Subtree',
        clazz: 'Subtree',
        loc: `200 ${y}`,
        id,
        options: {
          behaviorPath: `../behaviors/${step.name}`,
          getNotepad: ['() => {', '    return {};', '}'],
          onResult: ['(treeResult) => {', '    return treeResult.transition;', '}'],
        },
        name: step.name,
      });
    }

    links.push({ from: prevId, to: id, fromPort: '', toPort: '' });
    prevId = id;
    y += 120;
  }

  if (!sawEnd) {
    ensureEnd(prevId);
  }

  return {
    class: 'go.GraphLinksModel',
    dataFormat: 'flow-1',
    nodeKeyProperty: 'id',
    nodeCategoryProperty: 'class',
    linkFromPortIdProperty: 'fromPort',
    linkToPortIdProperty: 'toPort',
    nodeDataArray: nodes,
    linkDataArray: links,
  };
}
