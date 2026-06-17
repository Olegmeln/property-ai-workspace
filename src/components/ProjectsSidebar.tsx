/**
 * Левая колонка платформы.
 *
 * Сверху — список проектов (как чаты в Claude).
 * Снизу — закреплённое поле промпта (через него создаётся новый проект).
 */

import { FormEvent, useState } from "react";
import { ArrowUp, Folder, Plus, Trash2 } from "lucide-react";
import { useT } from "../i18n";
import { useProjectsStore } from "../project/store";
import { useCountryStore, COUNTRY_META } from "../project/country";
import { cn } from "../lib/utils";

export function ProjectsSidebar() {
  const { t } = useT();
  const projects = useProjectsStore((s) => s.projects);
  const activeId = useProjectsStore((s) => s.activeProjectId);
  const selectProject = useProjectsStore((s) => s.selectProject);
  const deleteProject = useProjectsStore((s) => s.deleteProject);
  const createProject = useProjectsStore((s) => s.createProject);
  const country = useCountryStore((s) => s.country);

  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await createProject(trimmed, country);
      setPrompt("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-workspace-border bg-[#0B0E14]">
      {/* Projects list */}
      <div className="border-b border-workspace-border px-3 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            {t("sidebar.projects")}
          </p>
          <span className="text-[10px] text-slate-600">{projects.length}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {projects.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs leading-5 text-slate-500">
            {t("sidebar.empty")}
          </div>
        ) : (
          <ul className="space-y-0.5">
            {projects.map((p) => {
              const active = p.id === activeId;
              const dot =
                p.status === "running"
                  ? "bg-workspace-accent animate-pulse"
                  : p.status === "error"
                    ? "bg-rose-500"
                    : p.status === "done"
                      ? "bg-emerald-500"
                      : "bg-slate-600";
              const flag = COUNTRY_META[p.country].flag;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => selectProject(p.id)}
                    className={cn(
                      "group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition",
                      active
                        ? "bg-workspace-accent/15 text-white"
                        : "text-slate-300 hover:bg-white/5"
                    )}
                  >
                    <span className={cn("mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm">
                        <span className="text-xs leading-none">{flag}</span>
                        <span className="truncate">{p.title}</span>
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProject(p.id);
                      }}
                      className="opacity-0 transition hover:text-rose-400 group-hover:opacity-100"
                      aria-label="Delete project"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Prompt bar — закреплённая надстройка */}
      <form onSubmit={onSubmit} className="border-t border-workspace-border bg-[#0F1320] p-3">
        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-slate-500">
            <span className="flex items-center gap-1">
              <Plus className="h-3 w-3" />
              {t("sidebar.newProject")}
            </span>
            <span className="text-[10px] text-slate-600">
              {COUNTRY_META[country].flag}
            </span>
          </span>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                // Ctrl/Cmd + Enter → submit, как в Claude
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  void onSubmit(e as unknown as FormEvent);
                }
              }}
              placeholder={t("prompt.placeholder")}
              rows={3}
              className="w-full resize-none rounded-xl border border-workspace-border bg-[#0B0E14] px-3 py-2.5 pr-10 text-sm leading-5 text-slate-100 placeholder:text-slate-600 focus:border-workspace-accent/60 focus:outline-none focus:ring-1 focus:ring-workspace-accent/30"
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={!prompt.trim() || submitting}
              className={cn(
                "absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg transition",
                prompt.trim() && !submitting
                  ? "bg-workspace-accent text-[#08111F] hover:brightness-110"
                  : "bg-workspace-card text-slate-600"
              )}
              aria-label={t("prompt.send")}
              title={t("prompt.send")}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500">
            {t("prompt.hint", { country: t(`country.${country}`) })}
          </p>
        </label>
      </form>
    </aside>
  );
}
