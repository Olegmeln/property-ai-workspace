import type { Listing, StructuredQuery } from "../types";
import { fromRawListings, toRefinedQuery, type RawListing } from "./adapters";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

async function postJson<TInput, TOutput>(path: string, body: TInput): Promise<TOutput> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}`);
  }

  return response.json() as Promise<TOutput>;
}

export async function buildQuery(userText: string, params: Record<string, unknown>) {
  return postJson<{ text: string; params: Record<string, unknown> }, StructuredQuery>("/query", {
    text: userText,
    params
  });
}

export async function searchListings(query: StructuredQuery, _params: Record<string, unknown>) {
  const response = await postJson<
    { query: ReturnType<typeof toRefinedQuery> },
    { strategy: unknown; listings: RawListing[] }
  >("/search", { query: toRefinedQuery(query) });

  return fromRawListings(response.listings);
}

export async function normalizeListings(listings: Listing[], params: Record<string, unknown>) {
  return postJson<{ listings: Listing[]; params: Record<string, unknown> }, Listing[]>("/normalize", {
    listings,
    params
  });
}
