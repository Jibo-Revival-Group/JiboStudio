import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  parseFlow,
  serializeFlow,
  FLOW_NODE_PALETTE,
  type FlowDocument,
  type FlowNode,
} from '@jibo-studio/skill-model';
import { v4 as uuidv4 } from 'uuid';
import './flow-editor.css';

function flowNodeToReact(node: FlowNode): Node {
  const [x, y] = (node.loc ?? '0 0').split(' ').map(Number);
  return {
    id: node.id,
    type: 'flowNode',
    position: { x: x || 0, y: y || 0 },
    data: {
      label: node.name || node.class.split('.').pop() || node.class,
      className: node.class,
      options: node.options ?? {},
    },
  };
}

function reactNodeToFlow(node: Node): FlowNode {
  return {
    class: node.data.className as string,
    clazz: node.data.className as string,
    loc: `${node.position.x} ${node.position.y}`,
    id: node.id,
    name: node.data.label as string,
    options: node.data.options as Record<string, unknown>,
    ...(String(node.data.className).startsWith('Play') ? { 'asset-pack': 'core' } : {}),
  };
}

function FlowNodeComponent({ data }: { data: { label: string; className: string } }) {
  return (
    <div className="flow-node">
      <Handle type="target" position={Position.Top} />
      <div className="flow-node__class">{data.className}</div>
      <div className="flow-node__label">{data.label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { flowNode: FlowNodeComponent };

export interface FlowEditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

export function FlowEditor({ content, onChange, readOnly }: FlowEditorProps) {
  const doc = useMemo(() => parseFlow(content), [content]);
  const initialNodes = useMemo(() => doc.nodeDataArray.map(flowNodeToReact), [doc]);
  const initialEdges = useMemo(
    () =>
      doc.linkDataArray.map((link, i) => ({
        id: `e-${i}`,
        source: link.from,
        target: link.to,
      })),
    [doc],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedPalette, setSelectedPalette] = useState<string | null>(null);

  useEffect(() => {
    setNodes(doc.nodeDataArray.map(flowNodeToReact));
    setEdges(
      doc.linkDataArray.map((link, i) => ({
        id: `e-${i}`,
        source: link.from,
        target: link.to,
      })),
    );
  }, [content, doc, setNodes, setEdges]);

  const emitChange = useCallback(
    (n: Node[], e: Edge[]) => {
      const flowDoc: FlowDocument = {
        ...doc,
        nodeDataArray: n.map(reactNodeToFlow),
        linkDataArray: e.map((edge) => ({
          from: edge.source,
          to: edge.target,
          fromPort: '',
          toPort: '',
        })),
      };
      onChange(serializeFlow(flowDoc));
    },
    [doc, onChange],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const next = addEdge(connection, eds);
        emitChange(nodes, next);
        return next;
      });
    },
    [nodes, setEdges, emitChange],
  );

  const onNodesDragStop = useCallback(() => {
    emitChange(nodes, edges);
  }, [nodes, edges, emitChange]);

  const addNode = (className: string, label: string) => {
    const id = uuidv4();
    const newNode: Node = {
      id,
      type: 'flowNode',
      position: { x: 250 + Math.random() * 100, y: 150 + Math.random() * 100 },
      data: { label, className, options: {} },
    };
    const next = [...nodes, newNode];
    setNodes(next);
    emitChange(next, edges);
    setSelectedPalette(null);
  };

  return (
    <div className="flow-editor">
      <div className="flow-editor__palette">
        <h4>Nodes</h4>
        {FLOW_NODE_PALETTE.map((item) => (
          <button
            key={item.class}
            type="button"
            className="flow-editor__palette-btn"
            disabled={readOnly}
            onClick={() => addNode(item.class, item.label)}
          >
            <span className="flow-editor__palette-cat">{item.category}</span>
            {item.label}
          </button>
        ))}
      </div>
      <div className="flow-editor__canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={readOnly ? undefined : onConnect}
          onNodeDragStop={readOnly ? undefined : onNodesDragStop}
          nodeTypes={nodeTypes}
          colorMode="dark"
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} color="#2a2a2a" />
          <Controls />
          <MiniMap nodeColor="#56c06d" maskColor="rgba(0,0,0,0.75)" />
        </ReactFlow>
      </div>
    </div>
  );
}

export { parseFlow, serializeFlow };
