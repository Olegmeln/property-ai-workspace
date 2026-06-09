/**
 * Модал "Создать / вызвать агента".
 *
 * Что делает:
 *  - Принимает свободное описание задачи.
 *  - Позволяет выбрать тип агента или оставить авто-определение.
 *  - На submit: добавляет ноду на канвас + кладёт текст в userPrompt
 *    (его подхватывает Run Pipeline на следующем запуске).
 *
 * Auto-detect — простая эвристика по ключевым словам. Без LLM, чтобы модал
 * не падал в офлайне. Когда подключится Claude, можно заменить на вызов
 * /classify-task — интерфейс уже совместим.
 */

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { Modal } from "./ui/modal";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useT } from "../i18n";
import { useWorkspaceStore } from "../store/workspace";
import { agentIcons, agentTemplates } from "../agents/templates";
import type { AgentType } from "../types";
import { cn } from "../lib/utils";

type Selection = AgentType | "auto";

interface CreateAgentModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateAgentModal({ open, onClose }: CreateAgentModalProps) {
  const { t, lang } = useT();
  const addAgent = useWorkspaceStore((s) => s.addAgent);
  const setActiveAgent = useWorkspaceStore((s) => s.setActiveAgent);
  const setUserPrompt = useWorkspaceStore((s) => s.setUserPrompt);
  const nodes = useWorkspaceStore((s) => s.nodes);

  const [task, setTask] = useState("");
  const [selection, setSelection] = useState<Selection>("auto");
  const [touched, setTouched] = useState(false);

  // Сброс состояния при каждом открытии — модал должен быть "чистым".
  useEffect(() => {
    if (open) {
      setTask("");
      setSelection("auto");
      setTouched(false);
    }
  }, [open]);

  const taskTrimmed = task.trim();
  const requiredMsg = !taskTrimmed && touched ? t("createAgent.validationRequired") : null;

  const resolvedType: AgentType = useMemo(() => {
    if (selection !== "auto") return selection;
    return detectAgentType(taskTrimmed);
  }, [selection, taskTrimmed]);

  const resolvedTemplate = agentTemplates.find((tpl) => tpl.type === resolvedType)!;
  const ResolvedIcon = agentIcons[resolvedType];

  const submit = () => {
    setTouched(true);
    if (!taskTrimmed) return;

    setUserPrompt(taskTrimmed);

    // Простая раскладка: новые ноды появляются с лёгким смещением, чтобы не
    // налезать на существующие.
    const position = {
      x: 160 + (nodes.length % 4) * 110,
      y: 220 + Math.floor(nodes.length / 4) * 130
    };
    addAgent({ type: resolvedType, position });

    // Активируем последнюю добавленную ноду — она в конце массива.
    // Чтобы это сделать корректно, читаем id из стора после addAgent.
    setTimeout(() => {
      const latest = useWorkspaceStore.getState().nodes.at(-1);
      if (latest) setActiveAgent(latest.id);
    }, 0);

    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("createAgent.title")}
      subtitle={t("createAgent.subtitle")}
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("createAgent.cancel")}
          </Button>
          <Button size="sm" onClick={submit} disabled={!taskTrimmed}>
            <Sparkles className="h-4 w-4" />
            {t("createAgent.submit")}
          </Button>
        </>
      }
    >
      {/* Описание задачи */}
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
          {t("createAgent.taskLabel")}
        </span>
        <Textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder={t("createAgent.taskPlaceholder")}
          rows={5}
          className="mt-2"
        />
        {requiredMsg && <p className="mt-1.5 text-xs text-rose-400">{requiredMsg}</p>}
      </label>

      {/* Тип агента */}
      <fieldset className="mt-5">
        <legend className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
          {t("createAgent.typeLabel")}
        </legend>

        <div className="mt-2 space-y-2">
          <TypeOption
            selected={selection === "auto"}
            onSelect={() => setSelection("auto")}
            icon={<Sparkles className="h-4 w-4" />}
            title={t("createAgent.typeAuto")}
            description={t("createAgent.typeAutoHint")}
            suffix={
              selection === "auto" && taskTrimmed ? (
                <span className="text-[10px] uppercase tracking-wider text-workspace-accent">
                  → {t(templateKey(resolvedType, "title"))}
                </span>
              ) : null
            }
          />

          <p className="px-1 pt-2 text-xs text-slate-500">{t("createAgent.recent")}</p>

          {agentTemplates.map((tpl) => {
            const Icon = agentIcons[tpl.type];
            return (
              <TypeOption
                key={tpl.type}
                selected={selection === tpl.type}
                onSelect={() => setSelection(tpl.type)}
                icon={<Icon className="h-4 w-4" />}
                title={t(templateKey(tpl.type, "title"))}
                description={t(templateKey(tpl.type, "description"))}
              />
            );
          })}
        </div>
      </fieldset>

      {/* Превью результата */}
      {taskTrimmed && (
        <div className="mt-5 rounded-2xl border border-workspace-border bg-[#151A24] p-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
            {lang === "ru" ? "Будет создано" : "Will be created"}
          </p>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-workspace-accent/10 text-workspace-accent">
              <ResolvedIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{t(templateKey(resolvedType, "title"))}</p>
              <p className="truncate text-xs text-slate-400">{taskTrimmed}</p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function TypeOption({
  selected,
  onSelect,
  icon,
  title,
  description,
  suffix
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  suffix?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border bg-[#151A24] p-3 text-left transition",
        selected
          ? "border-workspace-accent/60 ring-1 ring-workspace-accent/30"
          : "border-workspace-border hover:border-workspace-accent/40"
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg",
          selected ? "bg-workspace-accent/20 text-workspace-accent" : "bg-white/5 text-slate-400"
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-white">{title}</p>
          {suffix}
        </div>
        <p className="mt-0.5 text-xs leading-5 text-slate-400">{description}</p>
      </div>
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 transition",
          selected ? "rotate-180 text-workspace-accent" : "text-slate-600"
        )}
      />
    </button>
  );
}

// ============================================================
// Helpers
// ============================================================

/**
 * Эвристика выбора агента по описанию. Простая, чтобы работала офлайн.
 * Когда подключится LLM-классификатор — заменим на /classify-task.
 */
function detectAgentType(text: string): AgentType {
  const lower = text.toLowerCase();

  // Слова намекающие на сам поиск/листинги
  if (/(поиск|find|search|listing|объявлен|листинг|найди|подбор)/i.test(lower)) {
    return "listing-search";
  }
  // Слова про оценку/скоринг/нормализацию
  if (
    /(норм|стандарт|скор|оценк|ранжир|сравн|normali[sz]e|score|rank|valuation)/i.test(lower)
  ) {
    return "result-normalizer";
  }
  // По умолчанию — query builder. Это самый частый "входной" сценарий.
  return "query-builder";
}

function templateKey(type: AgentType, suffix: "title" | "description"): string {
  const map: Record<AgentType, string> = {
    "query-builder": "agent.queryBuilder",
    "listing-search": "agent.listingSearch",
    "result-normalizer": "agent.resultNormalizer"
  };
  return `${map[type]}.${suffix}`;
}
