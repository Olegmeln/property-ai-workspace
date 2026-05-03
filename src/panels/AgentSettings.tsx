import { SlidersHorizontal } from "lucide-react";
import { useWorkspaceStore } from "../store/workspace";
import { Input } from "../components/ui/input";
import { Panel } from "../components/ui/panel";

export function AgentSettings() {
  const nodes = useWorkspaceStore((state) => state.nodes);
  const activeAgentId = useWorkspaceStore((state) => state.activeAgentId);
  const updateAgentParams = useWorkspaceStore((state) => state.updateAgentParams);
  const agent = nodes.find((node) => node.id === activeAgentId);

  return (
    <Panel className="flex h-full w-80 flex-col rounded-none border-y-0 border-r-0">
      <div className="border-b border-workspace-border p-4">
        <div className="flex items-center gap-2 text-slate-400">
          <SlidersHorizontal className="h-4 w-4" />
          <p className="text-xs font-medium uppercase tracking-[0.16em]">Agent Settings</p>
        </div>
        <h2 className="mt-2 text-lg font-semibold text-white">{agent?.data.title ?? "No agent selected"}</h2>
      </div>
      {!agent ? (
        <div className="p-4 text-sm text-slate-500">Select an agent on the canvas to inspect its parameters.</div>
      ) : (
        <div className="flex-1 space-y-4 overflow-auto p-4">
          <StatusPill status={agent.data.status} />
          <p className="text-sm leading-6 text-slate-400">{agent.data.description}</p>
          <div className="space-y-3">
            {Object.entries(agent.data.params).map(([key, value]) => (
              <label key={key} className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{key}</span>
                <Input
                  value={Array.isArray(value) ? value.join(", ") : String(value)}
                  onChange={(event) => updateAgentParams(agent.id, { [key]: coerceValue(event.target.value, value) })}
                />
              </label>
            ))}
          </div>
          {agent.data.output !== undefined && (
            <div className="rounded-2xl border border-workspace-border bg-[#111620] p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Last Output</p>
              <pre className="max-h-72 overflow-auto text-xs leading-5 text-slate-300">
                {JSON.stringify(agent.data.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className="inline-flex rounded-full border border-workspace-border px-3 py-1 text-xs capitalize text-slate-300">
      {status}
    </span>
  );
}

function coerceValue(raw: string, current: unknown) {
  if (Array.isArray(current)) return raw.split(",").map((item) => item.trim()).filter(Boolean);
  if (typeof current === "number") return Number(raw) || 0;
  return raw;
}
