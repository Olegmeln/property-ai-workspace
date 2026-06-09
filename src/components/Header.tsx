import { useState } from "react";
import { Network, Play, Plus, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { CreateAgentModal } from "./CreateAgentModal";
import { useWorkspaceStore } from "../store/workspace";
import { useT } from "../i18n";

export function Header() {
  const { t } = useT();
  const runPipeline = useWorkspaceStore((state) => state.runPipeline);
  const activeAgentId = useWorkspaceStore((state) => state.activeAgentId);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-workspace-border bg-[#0B0E14] px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-workspace-border bg-workspace-card">
            <Network className="h-4 w-4 text-workspace-accent" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">{t("header.title")}</h1>
            <p className="text-xs text-slate-500">{t("header.subtitle")}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeAgentId && (
            <span className="hidden rounded-full border border-workspace-border px-3 py-1 text-xs text-slate-400 md:inline">
              {t("header.agentSelected")}
            </span>
          )}

          {/* Создать / вызвать агента — основная новая кнопка */}
          <Button variant="panel" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("header.createAgent")}</span>
          </Button>

          <Button onClick={() => void runPipeline()}>
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline">{t("header.runPipeline")}</span>
          </Button>

          <LanguageSwitcher />

          <Button variant="panel" size="icon" title={t("header.automationCenter")}>
            <Sparkles className="h-4 w-4 text-workspace-accent" />
          </Button>
        </div>
      </header>

      <CreateAgentModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
