/**
 * Standalone-резолвер переводов, работающий вне React-дерева.
 * Используется в Zustand store, где нет доступа к React Context.
 *
 * Читает язык напрямую из localStorage (тот же ключ, что и I18nProvider).
 * Это работает потому, что:
 *   1. Языковая настройка персистится в localStorage при каждом setLang.
 *   2. Вызовы tStandalone обычно происходят в ответ на действия пользователя,
 *      т.е. уже после того, как I18nProvider синхронизировался.
 */

import { en } from "./locales/en";
import { ru } from "./locales/ru";
import type { Lang, Dict } from "./index";

const DICTS: Record<Lang, Dict> = { ru, en };
const STORAGE_KEY = "paw.lang";

function getCurrentLang(): Lang {
  if (typeof window === "undefined") return "ru";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "ru" || stored === "en") return stored;
  return "ru";
}

export function tStandalone(key: string, vars?: Record<string, string | number>): string {
  const lang = getCurrentLang();
  const dict = DICTS[lang];
  const raw = dict[key] ?? DICTS.en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined ? `{${k}}` : String(v);
  });
}
