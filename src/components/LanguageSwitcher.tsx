import { useState, useRef, useEffect } from "react";
import { Languages, Check } from "lucide-react";
import { useT, type Lang } from "../i18n";
import { cn } from "../lib/utils";

const LANGS: Array<{ code: Lang; labelKey: string; short: string }> = [
  { code: "ru", labelKey: "lang.ru", short: "RU" },
  { code: "en", labelKey: "lang.en", short: "EN" }
];

export function LanguageSwitcher() {
  const { lang, setLang, t } = useT();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Закрытие по клику снаружи и по Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("lang.label")}
        title={t("lang.label")}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-workspace-border bg-workspace-card px-2.5 text-xs font-medium text-slate-100 transition hover:border-workspace-accent/70"
      >
        <Languages className="h-3.5 w-3.5 text-slate-400" />
        <span>{current.short}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-50 mt-1.5 min-w-[160px] overflow-hidden rounded-xl border border-workspace-border bg-workspace-card shadow-panel"
        >
          {LANGS.map((l) => {
            const active = l.code === lang;
            return (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setLang(l.code);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition",
                    active ? "bg-workspace-accent/10 text-white" : "text-slate-300 hover:bg-white/5"
                  )}
                >
                  <span>
                    <span className="mr-2 inline-block w-7 text-[10px] font-bold uppercase text-slate-500">
                      {l.short}
                    </span>
                    {t(l.labelKey)}
                  </span>
                  {active && <Check className="h-3.5 w-3.5 text-workspace-accent" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
