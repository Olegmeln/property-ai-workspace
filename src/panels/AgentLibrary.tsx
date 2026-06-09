import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { agentIcons, agentTemplates } from "../agents/templates";
import type { AgentTemplate, AgentType } from "../types";
import { Panel } from "../components/ui/panel";
import { useT } from "../i18n";

const TYPE_TO_KEY: Record<AgentType, string> = {
  "query-builder": "agent.queryBuilder",
  "listing-search": "agent.listingSearch",
  "result-normalizer": "agent.resultNormalizer"
};

export function AgentLibrary() {
  const { t } = useT();
  return (
    <Panel className="flex h-full w-72 flex-col rounded-none border-y-0 border-l-0">
      <div className="border-b border-workspace-border p-4">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
          {t("library.eyebrow")}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-white">{t("library.heading")}</h2>
      </div>
      <div className="space-y-3 p-3">
        {agentTemplates.map((agent) => (
          <DraggableAgent key={agent.type} agent={agent} />
        ))}
      </div>
    </Panel>
  );
}

function DraggableAgent({ agent }: { agent: AgentTemplate }) {
  const { t } = useT();
  const Icon = agentIcons[agent.type];
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-${agent.type}`,
    data: { type: agent.type }
  });

  const titleKey = `${TYPE_TO_KEY[agent.type]}.title`;
  const descKey = `${TYPE_TO_KEY[agent.type]}.description`;

  return (
    <button
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`w-full rounded-2xl border border-workspace-border bg-[#151A24] p-3 text-left transition hover:border-workspace-accent/70 ${
        isDragging ? "opacity-60" : ""
      }`}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-workspace-accent/10 text-workspace-accent">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-white">{t(titleKey)}</h3>
            <GripVertical className="h-4 w-4 text-slate-600" />
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-400">{t(descKey)}</p>
        </div>
      </div>
    </button>
  );
}
