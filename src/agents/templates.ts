import { Bot, DatabaseZap, WandSparkles } from "lucide-react";
import type { AgentTemplate, AgentType } from "../types";

export const agentTemplates: AgentTemplate[] = [
  {
    type: "query-builder",
    title: "Query Builder",
    description: "Turns plain language into a structured property brief.",
    defaultParams: {
      city: "Austin",
      budget_max: 850000,
      rooms_min: 2,
      districts: ["Downtown", "Zilker", "Mueller"]
    }
  },
  {
    type: "listing-search",
    title: "Listing Search",
    description: "Searches listing sources and returns candidate properties.",
    defaultParams: {
      source: "mock-marketplace",
      limit: 8
    }
  },
  {
    type: "result-normalizer",
    title: "Result Normalizer",
    description: "Standardizes price, area, rooms, district, and score.",
    defaultParams: {
      scoring: "value-location-fit"
    }
  }
];

export const agentIcons: Record<AgentType, typeof Bot> = {
  "query-builder": WandSparkles,
  "listing-search": DatabaseZap,
  "result-normalizer": Bot
};

export function getAgentTemplate(type: AgentType) {
  const template = agentTemplates.find((agent) => agent.type === type);
  if (!template) {
    throw new Error(`Unknown agent type: ${type}`);
  }
  return template;
}
