import { useCallback, useMemo, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  type ReactFlowInstance
} from "reactflow";
import "reactflow/dist/style.css";
import { useWorkspaceStore } from "../store/workspace";
import { AgentNode } from "./AgentNode";

const nodeTypes = { agent: AgentNode };

export function WorkspaceCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}

function CanvasInner() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  const nodes = useWorkspaceStore((state) => state.nodes);
  const edges = useWorkspaceStore((state) => state.edges);
  const onNodesChange = useWorkspaceStore((state) => state.onNodesChange);
  const onEdgesChange = useWorkspaceStore((state) => state.onEdgesChange);
  const onConnect = useWorkspaceStore((state) => state.onConnect);
  const setActiveAgent = useWorkspaceStore((state) => state.setActiveAgent);
  const memoNodeTypes = useMemo(() => nodeTypes, []);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowRef.current = instance;
  }, []);

  return (
    <div ref={wrapperRef} className="h-full min-h-0 flex-1 bg-workspace-bg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={memoNodeTypes}
        onInit={onInit}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => setActiveAgent(node.id)}
        onPaneClick={() => setActiveAgent(undefined)}
        fitView
        className="property-flow"
      >
        <Background color="#2A3140" gap={28} />
        <Controls className="!border-workspace-border !bg-workspace-card !shadow-panel" />
        <MiniMap
          pannable
          zoomable
          nodeColor="#4DA3FF"
          maskColor="rgba(15,17,23,0.75)"
          className="!border !border-workspace-border !bg-workspace-card"
        />
      </ReactFlow>
    </div>
  );
}
