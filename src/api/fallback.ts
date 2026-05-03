import type { Listing, StructuredQuery } from "../types";

export function fallbackQuery(text: string, params: Record<string, unknown>): StructuredQuery {
  const city = String(params.city ?? extractCity(text) ?? "Austin");
  const budget = Number(params.budget_max ?? extractBudget(text) ?? 850000);
  const rooms = Number(params.rooms_min ?? extractRooms(text) ?? 2);
  const districts = Array.isArray(params.districts)
    ? params.districts.map(String)
    : ["Downtown", "Zilker", "Mueller"];

  return { city, budget_max: budget, rooms_min: rooms, districts };
}

export function fallbackSearch(query: StructuredQuery): Listing[] {
  const districts = query.districts.length ? query.districts : ["Downtown", "Zilker", "Mueller"];
  return Array.from({ length: 8 }, (_, index) => {
    const district = districts[index % districts.length];
    const price = Math.max(320000, query.budget_max - index * 42000);
    return {
      id: `mock-${index + 1}`,
      title: `${district} property ${index + 1}`,
      price,
      area: 760 + index * 95,
      rooms: Math.max(query.rooms_min, 1 + (index % 4)),
      district,
      lat: 30.2672 + (index - 4) * 0.013,
      lng: -97.7431 + (index - 3) * 0.017,
      score: Math.round((92 - index * 4 + Math.random() * 3) * 10) / 10
    };
  });
}

export function fallbackNormalize(listings: Listing[]): Listing[] {
  return listings
    .map((listing) => ({
      ...listing,
      price: Math.round(listing.price),
      area: Math.round(listing.area),
      rooms: Math.round(listing.rooms),
      score: Math.max(0, Math.min(100, Math.round(listing.score * 10) / 10))
    }))
    .sort((a, b) => b.score - a.score);
}

function extractBudget(text: string) {
  const match = text.match(/\$?\s?(\d+(?:\.\d+)?)\s?(m|million|k)?/i);
  if (!match) return undefined;
  const value = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  if (unit === "m" || unit === "million") return value * 1_000_000;
  if (unit === "k") return value * 1_000;
  return value > 10_000 ? value : undefined;
}

function extractRooms(text: string) {
  const match = text.match(/(\d+)\s?(bed|beds|br|room|rooms)/i);
  return match ? Number(match[1]) : undefined;
}

function extractCity(text: string) {
  const match = text.match(/\bin\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/);
  return match?.[1];
}
