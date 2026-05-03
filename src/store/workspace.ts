import { create } from "zustand";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange
} from "reactflow";
import { buildQuery, normalizeListings, searchListings } from "../api/client";
import { fallbackNormalize, fallbackQuery, fallbackSearch } from "../api/fallback";
import { getAgentTemplate } from "../agents/templates";
import type {
  AddAgentInput,
  AgentData,
  AgentEdge,
  AgentNode,
  AgentStatus,
  ChatMessage,
  Listing,
  StructuredQuery,
  WorkspaceLayout
} from "../types";
import { makeId } from "../lib/utils";

interface WorkspaceState {
  nodes: AgentNode[];
  edges: AgentEdge[];
  results: Listing[];
  activeAgentId?: string;
  chatMessages: ChatMessage[];
  layout: WorkspaceLayout;
  userPrompt: string;
  addAgent: (input: AddAgentInput) => void;
  setActiveAgent: (agentId?: string) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  updateAgentParams: (agentId: string, params: Record<string, unknown>) => void;
  setResultsView: (view: WorkspaceLayout["resultsView"]) => void;
  sendChatMessage: (message: string) => Promise<void>;
  runPipeline: () => Promise<void>;
}

const starterQuery = "Find 2+ bedroom homes in Austin under $850k near walkable districts.";

const initialNodes: AgentNode[] = [
  makeAgentNode("query-builder", { x: 120, y: 120 }),
  makeAgentNode("listing-search", { x: 440, y: 120 }),
  makeAgentNode("result-normalizer", { x: 760, y: 120 })
];

const initialEdges: AgentEdge[] = [
  {
    id: "query-to-search",
    source: initialNodes[0].id,
    target: initialNodes[1].id,
    animated: true,
    style: { stroke: "#4DA3FF", strokeWidth: 2 }
  },
  {
    id: "search-to-normalizer",
    source: initialNodes[1].id,
    target: initialNodes[2].id,
    animated: true,
    style: { stroke: "#4DA3FF", strokeWidth: 2 }
  }
];

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  results: [],
  activeAgentId: initialNodes[0].id,
  chatMessages: [
    {
      id: makeId("msg"),
      role: "assistant",
      content: "Workspace ready. Select an agent and send instructions, or run the pipeline.",
      agentId: initialNodes[0].id
    }
  ],
  layout: {
    resultsView: "table",
    bottomPanelHeight: 280,
    rightSidebarOpen: true
  },
  userPrompt: starterQuery,
  addAgent: ({ type, position }) => {
    set((state) => ({
      nodes: [...state.nodes, makeAgentNode(type, position)]
    }));
  },
  setActiveAgent: (agentId) => set({ activeAgentId: agentId }),
  onNodesChange: (changes) => set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) })),
  onEdgesChange: (changes) => set((state) => ({ edges: applyEdgeChanges(changes, state.edges) })),
  onConnect: (connection) => {
    set((state) => ({
      edges: addEdge(
        {
          ...connection,
          animated: true,
          style: { stroke: "#4DA3FF", strokeWidth: 2 }
        },
        state.edges
      )
    }));
  },
  updateAgentParams: (agentId, params) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === agentId
          ? { ...node, data: { ...node.data, params: { ...node.data.params, ...params } } }
          : node
      )
    }));
  },
  setResultsView: (resultsView) => {
    set((state) => ({ layout: { ...state.layout, resultsView } }));
  },
  sendChatMessage: async (message) => {
    const { activeAgentId, updateAgentParams } = get();
    const userMessage: ChatMessage = {
      id: makeId("msg"),
      role: "user",
      content: message,
      agentId: activeAgentId
    };

    set((state) => ({ chatMessages: [...state.chatMessages, userMessage] }));

    if (activeAgentId) {
      const updates = parseInstruction(message);
      if (Object.keys(updates).length > 0) {
        updateAgentParams(activeAgentId, updates);
      }
    }

    set((state) => ({
      chatMessages: [
        ...state.chatMessages,
        {
          id: makeId("msg"),
          role: "assistant",
          agentId: activeAgentId,
          content: activeAgentId
            ? "Updated the selected agent context. Run the pipeline to apply it."
            : "Select an agent first, then send instructions to tune its behavior."
        }
      ]
    }));
  },
  runPipeline: async () => {
    const state = get();
    const ordered = orderPipeline(state.nodes, state.edges);
    let payload: unknown = state.userPrompt;

    setAgentStatuses(set, ordered.map((node) => node.id), "idle");

    for (const node of ordered) {
      setAgentStatuses(set, [node.id], "running");
      try {
        if (node.data.type === "query-builder") {
          payload = await runWithFallback(
            () => buildQuery(String(payload || state.userPrompt), node.data.params),
            () => fallbackQuery(String(payload || state.userPrompt), node.data.params)
          );
        }

        if (node.data.type === "listing-search") {
          payload = await runWithFallback(
            () => searchListings(payload as StructuredQuery, node.data.params),
            () => fallbackSearch(payload as StructuredQuery)
          );
        }

        if (node.data.type === "result-normalizer") {
          payload = await runWithFallback(
            () => normalizeListings(payload as Listing[], node.data.params),
            () => fallbackNormalize(payload as Listing[])
          );
          set({ results: payload as Listing[] });
        }

        set((current) => ({
          nodes: current.nodes.map((candidate) =>
            candidate.id === node.id
              ? {
                  ...candidate,
                  data: { ...candidate.data, status: "completed", output: payload }
                }
              : candidate
          )
        }));
      } catch (error) {
        setAgentStatuses(set, [node.id], "error");
        throw error;
      }
    }
  }
}));

function makeAgentNode(type: AgentData["type"], position: { x: number; y: number }): AgentNode {
  const template = getAgentTemplate(type);
  return {
    id: makeId(type),
    type: "agent",
    position,
    data: {
      type,
      title: template.title,
      description: template.description,
      status: "idle",
      params: template.defaultParams
    }
  };
}

function setAgentStatuses(
  set: (partial: Partial<WorkspaceState> | ((state: WorkspaceState) => Partial<WorkspaceState>)) => void,
  ids: string[],
  status: AgentStatus
) {
  set((state) => ({
    nodes: state.nodes.map((node) =>
      ids.includes(node.id) ? { ...node, data: { ...node.data, status } } : node
    )
  }));
}

function orderPipeline(nodes: AgentNode[], edges: AgentEdge[]) {
  const preferred = ["query-builder", "listing-search", "result-normalizer"];
  const connectedIds = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
  return [...nodes]
    .filter((node) => connectedIds.has(node.id) || nodes.length <= 3)
    .sort((a, b) => preferred.indexOf(a.data.type) - preferred.indexOf(b.data.type));
}

async function runWithFallback<T>(remote: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await remote();
  } catch {
    return fallback();
  }
}

function parseInstruction(message: string): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  const budget = message.match(/(?:budget|max|under)\D*(\d+(?:\.\d+)?)\s?(m|million|k)?/i);
  const rooms = message.match(/(\d+)\s?(bed|beds|br|room|rooms)/i);
  const city = message.match(/\bin\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/);
  const districts = message.match(/districts?\s*[:=]\s*([a-zA-Z,\s]+)/i);

  if (budget) {
    const value = Number(budget[1]);
    const unit = budget[2]?.toLowerCase();
    updates.budget_max = unit === "m" || unit === "million" ? value * 1_000_000 : unit === "k" ? value * 1_000 : value;
  }
  if (rooms) updates.rooms_min = Number(rooms[1]);
  if (city) updates.city = city[1];
  if (districts) updates.districts = districts[1].split(",").map((item) => item.trim()).filter(Boolean);

  if (Object.keys(updates).length === 0) {
    updates.instruction = message;
  }

  return updates;
}
