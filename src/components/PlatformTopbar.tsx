import { Network } from "lucide-react";
import { CountryPicker } from "./CountryPicker";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { OnlineIndicator } from "./OnlineIndicator";
import { useT } from "../i18n";

export function PlatformTopbar() {
  const { t } = useT();
  return (
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
        <CountryPicker />
        <LanguageSwitcher />
        <OnlineIndicator />
      </div>
    </header>
  );
}
