import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { agentIcons } from "../agents/templates";
import type { AgentData } from "../types";

export function AgentNode({ data, selected }: NodeProps<AgentData>) {
  const Icon = agentIcons[data.type];

  return (
    <div
      className={`min-w-64 rounded-2xl border bg-workspace-card p-4 shadow-panel transition ${
        selected ? "border-workspace-accent" : "border-workspace-border"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!border-workspace-bg !bg-workspace-accent" />
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-workspace-accent/10 text-workspace-accent">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="truncate text-sm font-semibold text-white">{data.title}</h3>
            <StatusIcon status={data.status} />
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-400">{data.description}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {Object.entries(data.params)
          .slice(0, 4)
          .map(([key, value]) => (
            <div key={key} className="rounded-xl border border-workspace-border bg-[#121722] px-3 py-2">
              <p className="truncate text-[10px] uppercase tracking-[0.12em] text-slate-500">{key}</p>
              <p className="mt-1 truncate text-xs text-slate-200">{Array.isArray(value) ? value.join(", ") : String(value)}</p>
            </div>
          ))}
      </div>
      <Handle type="source" position={Position.Right} className="!border-workspace-bg !bg-workspace-accent" />
    </div>
  );
}

function StatusIcon({ status }: { status: AgentData["status"] }) {
  if (status === "running") return <Loader2 className="h-4 w-4 animate-spin text-workspace-accent" />;
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === "error") return <XCircle className="h-4 w-4 text-rose-400" />;
  return <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />;
}
