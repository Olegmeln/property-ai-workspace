/**
 * Развёрнутый вид одного шага проекта.
 *
 * Открывается поверх рабочего стола, когда пользователь нажимает «развернуть»
 * на карточке шага. Тут показываем:
 *  - список агентов с их статусами и скиллами
 *  - результат шага (JSON для технических шагов, карточки листингов для search/results)
 *  - кнопку «свернуть»
 */

import { ArrowLeft, Maximize2, Sparkles } from "lucide-react";
import { useT } from "../i18n";
import type { Project, ProjectStep, ProjectStepType } from "./types";
import { ListingCard } from "./ListingCard";
import { cn } from "../lib/utils";

interface StepDetailViewProps {
  project: Project;
  step: ProjectStep;
  onClose: () => void;
}

const STEP_KEYS: Record<ProjectStepType, { title: string; subtitle: string }> = {
  refiner: { title: "project.steps.refiner", subtitle: "project.steps.refinerSub" },
  strategy: { title: "project.steps.strategy", subtitle: "project.steps.strategySub" },
  search: { title: "project.steps.search", subtitle: "project.steps.searchSub" },
  results: { title: "project.steps.results", subtitle: "project.steps.resultsSub" }
};

export function StepDetailView({ project, step, onClose }: StepDetailViewProps) {
  const { t } = useT();
  const keys = STEP_KEYS[step.type];
  // Карточки листингов показываем на шагах search и results.
  const showListings = step.type === "results" || step.type === "search";
  const listings = project.results;

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-workspace-bg">
      {/* Toolbar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-workspace-border bg-[#0B0E14] px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-workspace-border text-slate-300 transition hover:border-workspace-accent/60 hover:text-white"
            aria-label={t("common.back")}
            title={t("common.back")}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{project.title}</p>
            <h2 className="truncate text-sm font-semibold text-white">{t(keys.title)}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px]",
              step.status === "running"
                ? "bg-workspace-accent/10 text-workspace-accent"
                : step.status === "done"
                  ? "bg-emerald-500/10 text-emerald-300"
                  : step.status === "error"
                    ? "bg-rose-500/10 text-rose-300"
                    : "bg-slate-800 text-slate-400"
            )}
          >
            {t(`project.status.${step.status}`)}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-6">
          {/* Agents section */}
          <section>
            <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              {t("stepDetail.agents")}
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {step.agents.map((agent) => (
                <div
                  key={agent.id}
                  className="rounded-2xl border border-workspace-border bg-workspace-card p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-workspace-accent/10 text-workspace-accent">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-sm font-semibold text-white">{agent.name}</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px]",
                        agent.status === "running"
                          ? "bg-workspace-accent/10 text-workspace-accent"
                          : agent.status === "done"
                            ? "bg-emerald-500/10 text-emerald-300"
                            : agent.status === "error"
                              ? "bg-rose-500/10 text-rose-300"
                              : "bg-slate-800 text-slate-400"
                      )}
                    >
                      {t(`project.status.${agent.status}`)}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">{agent.channel}</p>
                  {agent.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {agent.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full border border-workspace-border bg-[#0B0E14] px-1.5 py-0.5 text-[10px] text-slate-400"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                  {agent.detail && (
                    <p className="mt-2 text-xs text-slate-400">{agent.detail}</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Error */}
          {step.status === "error" && step.errorMessage && (
            <section className="mt-6">
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-rose-400">
                {t("stepDetail.errorTitle")}
              </h3>
              <div className="mt-2 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-300">
                {step.errorMessage}
              </div>
            </section>
          )}

          {/* Listings (на шагах search/results) */}
          {showListings && (
            <section className="mt-8">
              <div className="flex items-baseline justify-between">
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                    {t("stepDetail.results.title")}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {t("stepDetail.results.subtitle", { count: listings.length })}
                  </p>
                </div>
              </div>
              {listings.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-dashed border-workspace-border p-8 text-center text-sm text-slate-500">
                  {t("stepDetail.noOutput")}
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {listings.map((l) => (
                    <ListingCard key={l.id} listing={l} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Generic JSON output (на refiner/strategy) */}
          {!showListings && step.output !== undefined && (
            <section className="mt-6">
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                {t("stepDetail.output")}
              </h3>
              <pre className="mt-2 max-h-96 overflow-auto rounded-2xl border border-workspace-border bg-[#0B0E14] p-4 text-xs leading-5 text-slate-300">
                {JSON.stringify(step.output, null, 2)}
              </pre>
            </section>
          )}

          {!showListings && step.output === undefined && step.status !== "error" && (
            <section className="mt-6">
              <div className="rounded-2xl border border-dashed border-workspace-border p-8 text-center text-sm text-slate-500">
                <Maximize2 className="mx-auto mb-2 h-5 w-5 text-slate-600" />
                {t("stepDetail.noOutput")}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
