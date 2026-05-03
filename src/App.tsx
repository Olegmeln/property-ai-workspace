import { DndContext, type DragEndEvent, useDroppable } from "@dnd-kit/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Header } from "./components/Header";
import { WorkspaceCanvas } from "./canvas/WorkspaceCanvas";
import { AgentLibrary } from "./panels/AgentLibrary";
import { AgentSettings } from "./panels/AgentSettings";
import { ResultsPanel } from "./panels/ResultsPanel";
import { ChatPanel } from "./panels/ChatPanel";
import { useWorkspaceStore } from "./store/workspace";
import type { AgentType } from "./types";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceShell />
    </QueryClientProvider>
  );
}

function WorkspaceShell() {
  const addAgent = useWorkspaceStore((state) => state.addAgent);
  const nodeCount = useWorkspaceStore((state) => state.nodes.length);

  const onDragEnd = (event: DragEndEvent) => {
    const type = event.active.data.current?.type as AgentType | undefined;
    if (!type || event.over?.id !== "canvas-dropzone") return;
    addAgent({
      type,
      position: {
        x: 160 + (nodeCount % 4) * 90,
        y: 180 + Math.floor(nodeCount / 4) * 110
      }
    });
  };

  return (
    <DndContext onDragEnd={onDragEnd}>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-workspace-bg text-slate-100">
        <Header />
        <div className="flex min-h-0 flex-1">
          <AgentLibrary />
          <main className="flex min-w-0 flex-1 flex-col">
            <CanvasDropzone />
            <div className="grid h-[36vh] min-h-72 grid-cols-[minmax(0,1fr)_420px]">
              <ResultsPanel />
              <ChatPanel />
            </div>
          </main>
          <AgentSettings />
        </div>
      </div>
    </DndContext>
  );
}

function CanvasDropzone() {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas-dropzone" });
  return (
    <div ref={setNodeRef} className={`min-h-0 flex-1 ${isOver ? "outline outline-2 outline-workspace-accent" : ""}`}>
      <WorkspaceCanvas />
    </div>
  );
}
