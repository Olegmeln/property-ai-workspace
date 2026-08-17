import type { Listing, StructuredQuery } from "../types";

// Мёрит модели backend/app/models/schemas.py — фронт не генерирует клиент,
// поэтому формы держим синхронизированными вручную.

export type CountryCode = "AE" | "AM" | "GE";
export type DealKind = "buy" | "rent";
export type PropertyKind = "apartment" | "house" | "villa" | "studio" | "commercial" | "land" | "any";

export interface RefinedQuery {
  country: CountryCode;
  city: string | null;
  districts: string[];
  deal: DealKind;
  property_kind: PropertyKind;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  rooms_min: number | null;
  rooms_max: number | null;
  area_min_m2: number | null;
  area_max_m2: number | null;
  target_count: number;
  open_questions: string[];
  intent_summary: string | null;
}

export type SourceChannel = "bayut-rest" | "propertyfinder-rest" | "list-am-browser" | "myhome-ge-browser";

export interface RawListing {
  source: SourceChannel;
  external_id: string;
  title: string;
  url: string | null;
  country: CountryCode;
  city: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  price: number;
  currency: string;
  area_m2: number | null;
  rooms: number | null;
  property_kind: string | null;
  photo_url: string | null;
  raw: Record<string, unknown>;
}

// Пока districts[0] определяет страну через простую эвристику: город из
// формы у нас сейчас без явного поля страны (см. StructuredQuery). Армения
// — основной рынок MVP, поэтому дефолт "AM". Когда в UI появится явный
// выбор страны/рынка, этот адаптер станет тоньше, а не сложнее.
export function toRefinedQuery(query: StructuredQuery): RefinedQuery {
  return {
    country: "AM",
    city: query.city || null,
    districts: query.districts,
    deal: "buy",
    property_kind: "apartment",
    budget_min: null,
    budget_max: query.budget_max,
    currency: "USD",
    rooms_min: query.rooms_min,
    rooms_max: null,
    area_min_m2: null,
    area_max_m2: null,
    target_count: 100,
    open_questions: [],
    intent_summary: null
  };
}

export function fromRawListings(listings: RawListing[]): Listing[] {
  return listings.map((listing) => ({
    id: `${listing.source}:${listing.external_id}`,
    title: listing.title || "Без названия",
    price: listing.price,
    area: listing.area_m2 ?? 0,
    rooms: listing.rooms ?? 0,
    district: listing.district || "—",
    lat: listing.lat ?? 0,
    lng: listing.lng ?? 0,
    // RawListing не несёт score/reasoning — ранжирующего агента пока нет
    // в пайплайне (это отдельная будущая задача, не Фаза 0). 0 — честный
    // дефолт, а не заглушка «доделать потом».
    score: 0
  }));
}
