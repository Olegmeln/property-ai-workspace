/**
 * English dictionary. Это источник истины для ключей: каждый ключ, попавший
 * сюда, должен быть и в ru.ts. Если в коде используется ключ, которого нет
 * ни здесь, ни в ru — t() вернёт сам ключ, что заметно при разработке.
 */

import type { Dict } from "../index";

export const en: Dict = {
  // Header
  "header.title": "Property AI Workspace",
  "header.subtitle": "Agent canvas for real estate decisions",
  "header.agentSelected": "Agent selected",
  "header.runPipeline": "Run Pipeline",
  "header.createAgent": "Create / call agent",
  "header.automationCenter": "Automation center",

  // Language switcher
  "lang.label": "Language",
  "lang.ru": "Русский",
  "lang.en": "English",

  // Agent Library
  "library.eyebrow": "Agent Library",
  "library.heading": "Drag agents",

  // Agent Settings
  "settings.eyebrow": "Agent Settings",
  "settings.noAgent": "No agent selected",
  "settings.hint": "Select an agent on the canvas to inspect its parameters.",
  "settings.lastOutput": "Last Output",

  // Agent statuses
  "status.idle": "idle",
  "status.running": "running",
  "status.completed": "completed",
  "status.error": "error",

  // Chat
  "chat.title": "AI Chat",
  "chat.hint": "Messages apply to the selected agent",
  "chat.placeholder": "Example: set budget under 700k and districts: SoCo, Mueller",
  "chat.send": "Send",
  "chat.welcome": "Workspace ready. Select an agent and send instructions, or run the pipeline.",
  "chat.applied": "Updated the selected agent context. Run the pipeline to apply it.",
  "chat.selectAgent": "Select an agent first, then send instructions to tune its behavior.",

  // Results
  "results.title": "Results",
  "results.count": "{count} normalized listings",
  "results.table": "Table",
  "results.map": "Map",
  "results.col.listing": "Listing",
  "results.col.area": "Area",
  "results.col.areaSqft": "{value} sqft",

  // Map
  "map.empty": "No coordinates to display yet",
  "map.runHint": "Run the pipeline to plot listings.",
  "map.noTokenTitle": "Mapbox token not configured",
  "map.tokenRequired":
    "Add VITE_MAPBOX_TOKEN to enable the live map. Coordinates are preserved.",

  // Agent templates
  "agent.queryBuilder.title": "Query Builder",
  "agent.queryBuilder.description": "Turns plain language into a structured property brief.",
  "agent.listingSearch.title": "Listing Search",
  "agent.listingSearch.description": "Searches listing sources and returns candidate properties.",
  "agent.resultNormalizer.title": "Result Normalizer",
  "agent.resultNormalizer.description": "Standardizes price, area, rooms, district, and score.",

  // Create Agent modal
  "createAgent.title": "Create or call an agent",
  "createAgent.subtitle":
    "Describe the task in plain language. We will create the right agent on the canvas and pass your description as the starting context.",
  "createAgent.taskLabel": "Task description",
  "createAgent.taskPlaceholder":
    "Example: Find 2-bedroom apartments in Yerevan up to $200k near Cascade. Check the title is clean.",
  "createAgent.typeLabel": "Agent type",
  "createAgent.typeAuto": "Auto-detect",
  "createAgent.typeAutoHint": "We pick the best agent based on your description.",
  "createAgent.submit": "Create agent",
  "createAgent.cancel": "Cancel",
  "createAgent.validationRequired": "Please describe the task.",
  "createAgent.created": "Agent “{title}” added to the canvas.",
  "createAgent.recent": "Or pick a recent template",

  // Common
  "common.close": "Close"
};
