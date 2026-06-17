/**
 * Project store.
 *
 * Управляет списком проектов и активным проектом. Запускает pipeline через
 * наш backend (или через fallback при недоступности).
 *
 * Архитектурно store разделён с workspace.ts (агентский канвас): тот
 * остаётся для "expert mode" в будущем, этот — для основного UI.
 */

import { create } from "zustand";
import type { Project, ProjectListingResult, ProjectStep } from "./types";
import { makeId } from "../lib/utils";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "";

interface ProjectsState {
  projects: Project[];
  activeProjectId: string | null;
  /** ID шага, развёрнутого на весь экран, или null. */
  expandedStepType: ProjectStep["type"] | null;

  // selectors
  activeProject: () => Project | null;

  // mutations
  createProject: (prompt: string, country: Project["country"]) => Promise<string>;
  selectProject: (id: string) => void;
  deleteProject: (id: string) => void;
  expandStep: (stepType: ProjectStep["type"] | null) => void;

  // pipeline
  runProject: (id: string) => Promise<void>;
}

// ============================================================
//  Дефолтная схема проекта
// ============================================================

function createInitialSteps(): ProjectStep[] {
  return [
    {
      type: "refiner",
      title: "Уточнение запроса",
      subtitle: "Структурирует свободный текст в бриф",
      status: "idle",
      agents: [
        {
          id: makeId("ag"),
          name: "Refiner",
          channel: "claude:refiner",
          skills: ["NLU", "Tool Use", "Clarifications"],
          status: "idle"
        }
      ]
    },
    {
      type: "strategy",
      title: "Выбор стратегии",
      subtitle: "Решает, какие источники подключить",
      status: "idle",
      agents: [
        {
          id: makeId("ag"),
          name: "Strategist",
          channel: "rules:strategist",
          skills: ["Country Routing", "Source Map"],
          status: "idle"
        }
      ]
    },
    {
      type: "search",
      title: "Поиск",
      subtitle: "Параллельные агенты по источникам",
      status: "idle",
      agents: [
        // Изначально 1 агент-плейсхолдер. После Strategy список обновляется
        // под фактически выбранные источники.
        {
          id: makeId("ag"),
          name: "Search Coordinator",
          channel: "orchestrator",
          skills: ["REST API", "HTML Parsing", "Dedup"],
          status: "idle"
        }
      ]
    },
    {
      type: "results",
      title: "Результаты",
      subtitle: "Финальный список объектов",
      status: "idle",
      agents: [
        {
          id: makeId("ag"),
          name: "Ranker",
          channel: "claude:ranker",
          skills: ["Scoring", "Reasoning"],
          status: "idle"
        }
      ]
    }
  ];
}

// ============================================================
//  Store
// ============================================================

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  expandedStepType: null,

  activeProject: () => {
    const id = get().activeProjectId;
    if (!id) return null;
    return get().projects.find((p) => p.id === id) ?? null;
  },

  createProject: async (prompt, country) => {
    const id = makeId("proj");
    const now = Date.now();
    const project: Project = {
      id,
      prompt: prompt.trim(),
      title: deriveTitle(prompt),
      description: deriveDescription(prompt, country),
      country,
      status: "idle",
      createdAt: now,
      updatedAt: now,
      steps: createInitialSteps(),
      results: []
    };
    set((s) => ({
      projects: [project, ...s.projects],
      activeProjectId: id,
      expandedStepType: null
    }));
    // Сразу запускаем pipeline для нового проекта.
    void get().runProject(id);
    return id;
  },

  selectProject: (id) => set({ activeProjectId: id, expandedStepType: null }),

  deleteProject: (id) =>
    set((s) => {
      const next = s.projects.filter((p) => p.id !== id);
      const nextActive =
        s.activeProjectId === id ? (next[0]?.id ?? null) : s.activeProjectId;
      return { projects: next, activeProjectId: nextActive };
    }),

  expandStep: (stepType) => set({ expandedStepType: stepType }),

  runProject: async (id) => {
    const project = get().projects.find((p) => p.id === id);
    if (!project) return;

    // Helper: обновить состояние одного шага.
    const patchStep = (
      stepType: ProjectStep["type"],
      patch: Partial<ProjectStep>,
      agentPatch?: Partial<ProjectStep["agents"][number]>
    ) =>
      set((s) => ({
        projects: s.projects.map((p) =>
          p.id !== id
            ? p
            : {
                ...p,
                updatedAt: Date.now(),
                steps: p.steps.map((step) =>
                  step.type !== stepType
                    ? step
                    : {
                        ...step,
                        ...patch,
                        agents: agentPatch
                          ? step.agents.map((a) => ({ ...a, ...agentPatch }))
                          : step.agents
                      }
                )
              }
        )
      }));

    const patchProject = (patch: Partial<Project>) =>
      set((s) => ({
        projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p))
      }));

    patchProject({ status: "running" });

    // --- Step 1: Refiner ---
    patchStep("refiner", { status: "running" }, { status: "running" });
    let refined: unknown;
    try {
      refined = await callBackend("/refine", { text: project.prompt });
      patchStep(
        "refiner",
        { status: "done", output: refined },
        { status: "done" }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Refiner failed";
      patchStep(
        "refiner",
        { status: "error", errorMessage: message },
        { status: "error" }
      );
      patchProject({ status: "error" });
      return;
    }

    // --- Step 2: Strategy ---
    patchStep("strategy", { status: "running" }, { status: "running" });
    let strategy: { sources?: Array<{ channel: string; params?: Record<string, unknown> }> } = {};
    try {
      strategy = (await callBackend("/strategize", { query: refined })) as typeof strategy;
      patchStep(
        "strategy",
        { status: "done", output: strategy },
        { status: "done" }
      );

      // Перестраиваем агентов в Search-шаге под фактические источники.
      const sourceAgents = (strategy.sources ?? []).map((src) => ({
        id: makeId("ag"),
        name: humanizeChannel(src.channel),
        channel: src.channel,
        skills: skillsForChannel(src.channel),
        status: "idle" as const
      }));
      if (sourceAgents.length > 0) {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id !== id
              ? p
              : {
                  ...p,
                  steps: p.steps.map((step) =>
                    step.type === "search" ? { ...step, agents: sourceAgents } : step
                  )
                }
          )
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Strategist failed";
      patchStep(
        "strategy",
        { status: "error", errorMessage: message },
        { status: "error" }
      );
      patchProject({ status: "error" });
      return;
    }

    // --- Step 3: Search ---
    patchStep("search", { status: "running" }, { status: "running" });
    let searchResponse: { listings?: ProjectListingResult[] } = {};
    try {
      searchResponse = (await callBackend("/search", {
        query: refined,
        strategy
      })) as typeof searchResponse;
      patchStep(
        "search",
        {
          status: "done",
          output: { count: (searchResponse.listings ?? []).length }
        },
        { status: "done" }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed";
      patchStep(
        "search",
        { status: "error", errorMessage: message },
        { status: "error" }
      );
      patchProject({ status: "error" });
      return;
    }

    // --- Step 4: Results (пока без Ranker LLM-call'а — будет в Stage 2) ---
    patchStep("results", { status: "running" }, { status: "running" });
    const listings = (searchResponse.listings ?? []).map((raw, idx) => ({
      id: `${raw.id ?? idx}`,
      title: raw.title ?? "Listing",
      price: Number(raw.price ?? 0),
      currency: raw.currency ?? "AED",
      area_m2: raw.area_m2,
      rooms: raw.rooms,
      district: raw.district,
      city: raw.city,
      country: raw.country,
      url: raw.url,
      photo_url: raw.photo_url,
      score: raw.score
    }));
    patchStep(
      "results",
      { status: "done", output: { count: listings.length } },
      { status: "done" }
    );
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === id ? { ...p, results: listings, status: "done", updatedAt: Date.now() } : p
      )
    }));
  }
}));

// ============================================================
//  Helpers
// ============================================================

async function callBackend(path: string, body: unknown): Promise<unknown> {
  if (!API_BASE) {
    throw new Error("VITE_API_BASE_URL not configured");
  }
  const r = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const text = await r.text().catch(() => r.statusText);
    throw new Error(`${path} → ${r.status}: ${text.slice(0, 200)}`);
  }
  return r.json();
}

function deriveTitle(prompt: string): string {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 50) return trimmed || "Новый проект";
  return `${trimmed.slice(0, 47)}…`;
}

function deriveDescription(prompt: string, country: Project["country"]): string {
  // Минимальная "документация" проекта. Когда Ranker подключится, заменим
  // на сгенерированную Claude'ом сводку.
  const countryLabel = { AE: "ОАЭ", AM: "Армения", GE: "Грузия" }[country];
  return `Поиск недвижимости в стране: ${countryLabel}. Исходный запрос: «${prompt.trim()}».`;
}

function humanizeChannel(channel: string): string {
  const map: Record<string, string> = {
    "bayut-rest": "Bayut REST",
    "propertyfinder-rest": "PropertyFinder REST",
    "list-am-browser": "list.am Browser",
    "myhome-ge-browser": "myhome.ge Browser"
  };
  return map[channel] ?? channel;
}

function skillsForChannel(channel: string): string[] {
  const map: Record<string, string[]> = {
    "bayut-rest": ["REST API", "Pagination", "Schema Normalize"],
    "propertyfinder-rest": ["REST API", "Pagination"],
    "list-am-browser": ["HTML Parsing", "Anti-bot", "Geo Decode"],
    "myhome-ge-browser": ["HTML Parsing", "Geo Decode"]
  };
  return map[channel] ?? ["Generic"];
}
