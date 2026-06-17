/**
 * Рабочий стол активного проекта.
 *
 * Если проект не выбран — показываем заглушку с подсказкой использовать
 * промпт-окно слева внизу.
 *
 * Если выбран — рисуем вертикальную схему блоков (Refiner → Strategy →
 * Search → Results) со стрелками между ними.
 *
 * Если какой-то блок развёрнут — показываем поверх него StepDetailView.
 */

import { ArrowDown, Sparkles } from "lucide-react";
import { useT } from "../i18n";
import { useProjectsStore } from "./store";
import { StepBlock } from "./StepBlock";
import { StepDetailView } from "./StepDetailView";

export function ProjectCanvas() {
  const { t } = useT();
  const activeId = useProjectsStore((s) => s.activeProjectId);
  const projects = useProjectsStore((s) => s.projects);
  const expandedType = useProjectsStore((s) => s.expandedStepType);
  const expandStep = useProjectsStore((s) => s.expandStep);

  const project = projects.find((p) => p.id === activeId) ?? null;

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center bg-workspace-bg">
        <div className="max-w-md px-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-workspace-border bg-workspace-card text-workspace-accent">
            <Sparkles className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold text-white">{t("project.empty.title")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">{t("project.empty.hint")}</p>
        </div>
      </div>
    );
  }

  const expandedStep = expandedType ? project.steps.find((s) => s.type === expandedType) : null;

  return (
    <div className="relative h-full overflow-hidden bg-workspace-bg">
      {/* Project header */}
      <div className="flex h-auto items-start gap-3 border-b border-workspace-border bg-[#0B0E14] px-6 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-white">{project.title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">{project.description}</p>
        </div>
      </div>

      {/* Schema */}
      <div className="h-[calc(100%-72px)] overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-6 py-8">
          {project.steps.map((step, idx) => (
            <div key={step.type} className="flex w-full flex-col items-center">
              <StepBlock step={step} onExpand={() => expandStep(step.type)} />
              {idx < project.steps.length - 1 && (
                <div className="my-1 flex h-6 w-6 items-center justify-center text-slate-700">
                  <ArrowDown className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Expanded step overlay */}
      {expandedStep && (
        <StepDetailView project={project} step={expandedStep} onClose={() => expandStep(null)} />
      )}
    </div>
  );
}
