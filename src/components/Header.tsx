import { Network, Play, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { useWorkspaceStore } from "../store/workspace";

export function Header() {
  const runPipeline = useWorkspaceStore((state) => state.runPipeline);
  const activeAgentId = useWorkspaceStore((state) => state.activeAgentId);

  return (
    <header className="flex h-14 items-center justify-between border-b border-workspace-border bg-[#0B0E14] px-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-workspace-border bg-workspace-card">
          <Network className="h-4 w-4 text-workspace-accent" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white">Property AI Workspace</h1>
          <p className="text-xs text-slate-500">Agent canvas for real estate decisions</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {activeAgentId && (
          <span className="hidden rounded-full border border-workspace-border px-3 py-1 text-xs text-slate-400 md:inline">
            Agent selected
          </span>
        )}
        <Button onClick={() => void runPipeline()}>
          <Play className="h-4 w-4" />
          Run Pipeline
        </Button>
        <Button variant="panel" size="icon" title="Automation center">
          <Sparkles className="h-4 w-4 text-workspace-accent" />
        </Button>
      </div>
    </header>
  );
}
