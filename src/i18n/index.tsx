/**
 * Минимальный i18n.
 *
 * Архитектура: React Context + словари + localStorage. Никаких сторонних
 * зависимостей. Если в будущем понадобятся плюрализация, форматирование дат,
 * lazy-загрузка локалей — мигрировать на i18next через адаптер useT.
 *
 * API:
 *   const { t, lang, setLang } = useT();
 *   t("header.title")           // → "Property AI Workspace" или "Property AI Workspace"
 *   t("agents.budget", { value: 850000 })   // с подстановками {value}
 *
 * Ключи иерархические (с точкой). Если ключ не найден — возвращаем ключ
 * (это удобно: в UI сразу видно, что забыли перевести).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { en } from "./locales/en";
import { ru } from "./locales/ru";

export type Lang = "ru" | "en";
export type Dict = Record<string, string>;

const DICTIONARIES: Record<Lang, Dict> = { ru, en };
const STORAGE_KEY = "paw.lang";
const DEFAULT_LANG: Lang = "ru";

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function detectInitialLang(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANG;
  const stored = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
  if (stored === "ru" || stored === "en") return stored;
  // По умолчанию пытаемся определить из navigator.language, но русский — приоритет.
  const browser = (navigator.language || "").toLowerCase();
  if (browser.startsWith("ru")) return "ru";
  if (browser.startsWith("en")) return "en";
  return DEFAULT_LANG;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key];
    return v === undefined ? `{${key}}` : String(v);
  });
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* приватный режим браузера может бросить — игнорируем */
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = DICTIONARIES[lang];
      const value = dict[key];
      if (value === undefined) {
        // fallback на английский, чтобы недостающий перевод не ломал UI
        const fallback = DICTIONARIES.en[key];
        return interpolate(fallback ?? key, vars);
      }
      return interpolate(value, vars);
    },
    [lang]
  );

  const value = useMemo<I18nContextValue>(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useT must be used inside <I18nProvider>");
  }
  return ctx;
}
