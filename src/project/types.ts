/**
 * Доменная модель «Проект».
 *
 * Каждый проект имеет фиксированную схему из 4 шагов:
 *  1. Refiner — уточнение запроса
 *  2. Strategy — выбор источников
 *  3. Search — параллельный поиск (REST / Browser / ...)
 *  4. Results — итоговая выдача
 *
 * На каждый шаг привязаны один или несколько агентов. Один агент может
 * иметь несколько скиллов (например, AI-Native Brokerage Agent умеет и
 * REST, и parsing). У множества агентов разные роли — мы их визуализируем
 * как индикатор на блоке шага.
 */

export type ProjectStepType = "refiner" | "strategy" | "search" | "results";

export type ProjectStepStatus = "idle" | "running" | "done" | "error";

export interface ProjectAgent {
  /** ID агента. Не путать с типом шага — у шага может быть несколько агентов. */
  id: string;
  /** Видимое имя в UI. */
  name: string;
  /** Машинный канал/инструмент (bayut-rest, list-am-browser, etc.). */
  channel: string;
  /** Какие скиллы привязаны к агенту в этом шаге. */
  skills: string[];
  /** Статус конкретного агента. */
  status: ProjectStepStatus;
  /** Прогресс 0..100 (опционально, для долгих операций). */
  progress?: number;
  /** Свободная строка статуса (что делает прямо сейчас). */
  detail?: string;
}

export interface ProjectStep {
  type: ProjectStepType;
  title: string;
  /** Краткое описание шага в UI. */
  subtitle?: string;
  status: ProjectStepStatus;
  agents: ProjectAgent[];
  /** Произвольный артефакт этого шага (RefinedQuery / SearchStrategy / Listing[] / ...) */
  output?: unknown;
  /** Сообщение об ошибке если status === "error". */
  errorMessage?: string;
}

export interface ProjectListingResult {
  id: string;
  title: string;
  price: number;
  currency: string;
  area_m2?: number;
  rooms?: number;
  district?: string;
  city?: string;
  country?: string;
  url?: string;
  photo_url?: string;
  score?: number;
  reasoning?: string;
}

export interface Project {
  id: string;
  /** Что ввёл пользователь в промпт при создании проекта. */
  prompt: string;
  /** Заголовок проекта — короткая выжимка из промпта. */
  title: string;
  /** Структурированное описание-документация проекта, генерируется при создании. */
  description: string;
  /** Страна — выбирается в топбаре, фиксируется на проекте. */
  country: "AE" | "AM" | "GE";
  status: ProjectStepStatus;
  createdAt: number;
  updatedAt: number;
  steps: ProjectStep[];
  results: ProjectListingResult[];
}
