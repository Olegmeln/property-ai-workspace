import type { Edge, Node, XYPosition } from "reactflow";

export type AgentType = "query-builder" | "listing-search" | "result-normalizer";
export type AgentStatus = "idle" | "running" | "completed" | "error";

export interface StructuredQuery {
  city: string;
  budget_max: number;
  rooms_min: number;
  districts: string[];
}

export interface Listing {
  id: string;
  title: string;
  price: number;
  area: number;
  rooms: number;
  district: string;
  lat: number;
  lng: number;
  score: number;
}

export interface AgentData {
  type: AgentType;
  title: string;
  description: string;
  status: AgentStatus;
  input?: unknown;
  output?: unknown;
  params: Record<string, unknown>;
}

export type AgentNode = Node<AgentData>;
export type AgentEdge = Edge;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  agentId?: string;
}

export interface AgentTemplate {
  type: AgentType;
  title: string;
  description: string;
  defaultParams: Record<string, unknown>;
}

export interface WorkspaceLayout {
  resultsView: "table" | "map";
  bottomPanelHeight: number;
  rightSidebarOpen: boolean;
}

export interface AddAgentInput {
  type: AgentType;
  position: XYPosition;
}
