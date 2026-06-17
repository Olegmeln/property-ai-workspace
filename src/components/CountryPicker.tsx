import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useT } from "../i18n";
import { COUNTRY_META, useCountryStore, type Country } from "../project/country";
import { cn } from "../lib/utils";

const COUNTRIES: Country[] = ["AE", "AM", "GE"];

export function CountryPicker() {
  const { t } = useT();
  const country = useCountryStore((s) => s.country);
  const setCountry = useCountryStore((s) => s.setCountry);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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

  const current = COUNTRY_META[country];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("country.label")}
        title={t("country.label")}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-workspace-border bg-workspace-card pl-2 pr-2.5 text-sm font-medium text-slate-100 transition hover:border-workspace-accent/70"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="text-xs">{t(`country.${country}`)}</span>
        <ChevronDown className="h-3 w-3 text-slate-500" />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-50 mt-1.5 min-w-[160px] overflow-hidden rounded-xl border border-workspace-border bg-workspace-card shadow-panel"
        >
          {COUNTRIES.map((code) => {
            const meta = COUNTRY_META[code];
            const active = code === country;
            return (
              <li key={code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setCountry(code);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition",
                    active ? "bg-workspace-accent/10 text-white" : "text-slate-300 hover:bg-white/5"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base leading-none">{meta.flag}</span>
                    <span>{t(`country.${code}`)}</span>
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
