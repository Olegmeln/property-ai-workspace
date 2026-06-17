/**
 * Карточка одного шага в схеме проекта.
 *
 * Показывает: название шага, статус, индикатор «сколько агентов», превью
 * результата, кнопку «развернуть» — каждый блок раскрывается в детальный
 * экран с поисковой выдачей / логами / параметрами агентов.
 */

import {
  AlertCircle,
  Check,
  ChevronRight,
  Loader2,
  Maximize2,
  Sparkles
} from "lucide-react";
import { useT } from "../i18n";
import type { ProjectStep, ProjectStepType, ProjectStepStatus } from "../project/types";
import { cn } from "../lib/utils";

interface StepBlockProps {
  step: ProjectStep;
  onExpand: () => void;
}

const STEP_KEYS: Record<ProjectStepType, { title: string; subtitle: string }> = {
  refiner: { title: "project.steps.refiner", subtitle: "project.steps.refinerSub" },
  strategy: { title: "project.steps.strategy", subtitle: "project.steps.strategySub" },
  search: { title: "project.steps.search", subtitle: "project.steps.searchSub" },
  results: { title: "project.steps.results", subtitle: "project.steps.resultsSub" }
};

export function StepBlock({ step, onExpand }: StepBlockProps) {
  const { t } = useT();
  const keys = STEP_KEYS[step.type];

  return (
    <button
      type="button"
      onClick={onExpand}
      className={cn(
        "group relative flex w-full max-w-2xl items-stretch overflow-hidden rounded-2xl border bg-workspace-card text-left transition",
        "hover:border-workspace-accent/60",
        step.status === "running"
          ? "border-workspace-accent/40 shadow-[0_0_0_2px_rgba(77,163,255,0.10)]"
          : step.status === "error"
            ? "border-rose-500/40"
            : step.status === "done"
              ? "border-emerald-500/30"
              : "border-workspace-border"
      )}
    >
      {/* Левая полоса со статусом */}
      <div
        className={cn(
          "w-1 shrink-0",
          step.status === "running"
            ? "bg-workspace-accent"
            : step.status === "error"
              ? "bg-rose-500"
              : step.status === "done"
                ? "bg-emerald-500"
                : "bg-slate-700"
        )}
      />

      <div className="flex-1 p-4">
        {/* Header: title + status icon */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-white">{t(keys.title)}</h3>
              <StatusBadge status={step.status} />
            </div>
            <p className="mt-0.5 text-xs leading-5 text-slate-400">{t(keys.subtitle)}</p>
          </div>
          <Maximize2 className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:text-workspace-accent" />
        </div>

        {/* Agents row */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <AgentsBadge count={step.agents.length} />
          {step.agents.slice(0, 4).map((agent) => (
            <span
              key={agent.id}
              title={`${agent.name} (${agent.channel})`}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]",
                agent.status === "running"
                  ? "border-workspace-accent/40 bg-workspace-accent/10 text-workspace-accent"
                  : agent.status === "done"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : agent.status === "error"
                      ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                      : "border-workspace-border text-slate-400"
              )}
            >
              <Sparkles className="h-2.5 w-2.5" />
              {agent.name}
            </span>
          ))}
          {step.agents.length > 4 && (
            <span className="text-[10px] text-slate-500">+{step.agents.length - 4}</span>
          )}
        </div>

        {/* Output preview */}
        {step.status === "error" && step.errorMessage ? (
          <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/5 p-2.5 text-xs text-rose-300">
            {step.errorMessage}
          </div>
        ) : step.output ? (
          <OutputPreview type={step.type} output={step.output} />
        ) : null}

        {/* Footer hint */}
        <div className="mt-3 flex items-center justify-end text-[10px] uppercase tracking-wider text-slate-500">
          <span className="flex items-center gap-1">
            {t("project.openStep")}
            <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </button>
  );
}

// ============================================================
//  Sub-components
// ============================================================

function StatusBadge({ status }: { status: ProjectStepStatus }) {
  const { t } = useT();
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-workspace-accent/10 px-1.5 py-0.5 text-[10px] text-workspace-accent">
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
        {t("project.status.running")}
      </span>
    );
  }
  if (status === "done") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300">
        <Check className="h-2.5 w-2.5" />
        {t("project.status.done")}
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-300">
        <AlertCircle className="h-2.5 w-2.5" />
        {t("project.status.error")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500">
      {t("project.status.idle")}
    </span>
  );
}

function AgentsBadge({ count }: { count: number }) {
  const { t } = useT();
  const dots = Math.min(count, 5);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-[#0B0E14] px-2 py-0.5 text-[10px] text-slate-400"
      title={`${count} agent(s)`}
    >
      <span className="flex">
        {Array.from({ length: dots }).map((_, i) => (
          <span
            key={i}
            className="h-1 w-1 rounded-full bg-workspace-accent"
            style={{ marginLeft: i === 0 ? 0 : 2 }}
          />
        ))}
      </span>
      <span>{count === 1 ? t("project.agents.one") : t("project.agents.count", { count })}</span>
    </span>
  );
}

function OutputPreview({ type, output }: { type: ProjectStepType; output: unknown }) {
  const { t } = useT();
  // Лёгкое превью под каждый тип шага.
  if (type === "refiner" && output && typeof output === "object") {
    const o = output as Record<string, unknown>;
    const parts = [
      o.country && `🌍 ${o.country}`,
      o.budget_max && `💰 ≤ ${o.budget_max} ${o.currency ?? ""}`,
      o.rooms_min && `🛏 от ${o.rooms_min} комн.`
    ]
      .filter(Boolean)
      .join("  ·  ");
    return parts ? (
      <p className="mt-3 truncate text-xs text-slate-400">{parts}</p>
    ) : null;
  }

  if (type === "strategy" && output && typeof output === "object") {
    const sources = (output as { sources?: Array<{ channel: string }> }).sources ?? [];
    return (
      <p className="mt-3 text-xs text-slate-400">
        {sources.map((s) => s.channel).join(", ") || "—"}
      </p>
    );
  }

  if ((type === "search" || type === "results") && output && typeof output === "object") {
    const count = (output as { count?: number }).count ?? 0;
    return (
      <p className="mt-3 text-xs text-slate-400">
        {t("project.listingsFound", { count })}
      </p>
    );
  }

  return null;
}
