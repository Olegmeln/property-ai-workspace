import { describe, expect, it } from "vitest";
import { fromRawListings, toRefinedQuery } from "./adapters";

describe("toRefinedQuery", () => {
  it("maps a StructuredQuery into a valid RefinedQuery with sane defaults", () => {
    const result = toRefinedQuery({
      city: "Yerevan",
      budget_max: 150000,
      rooms_min: 2,
      districts: ["Center"]
    });

    expect(result.country).toBe("AM");
    expect(result.city).toBe("Yerevan");
    expect(result.districts).toEqual(["Center"]);
    expect(result.budget_max).toBe(150000);
    expect(result.rooms_min).toBe(2);
    expect(result.deal).toBe("buy");
    expect(result.property_kind).toBe("apartment");
    expect(result.target_count).toBe(100);
  });
});

describe("fromRawListings", () => {
  it("maps backend RawListing objects into the UI Listing shape", () => {
    const result = fromRawListings([
      {
        source: "list-am-browser",
        external_id: "12345",
        title: "2-room apartment",
        url: "https://www.list.am/item/12345",
        country: "AM",
        city: "Yerevan",
        district: "Center",
        lat: null,
        lng: null,
        price: 95000,
        currency: "USD",
        area_m2: 62,
        rooms: 2,
        property_kind: "apartment",
        photo_url: null,
        raw: {}
      }
    ]);

    expect(result).toEqual([
      {
        id: "list-am-browser:12345",
        title: "2-room apartment",
        price: 95000,
        area: 62,
        rooms: 2,
        district: "Center",
        lat: 0,
        lng: 0,
        score: 0
      }
    ]);
  });

  it("falls back to safe defaults when optional fields are missing", () => {
    const result = fromRawListings([
      {
        source: "bayut-rest",
        external_id: "77",
        title: "",
        url: null,
        country: "AE",
        city: null,
        district: null,
        lat: null,
        lng: null,
        price: 500000,
        currency: "AED",
        area_m2: null,
        rooms: null,
        property_kind: null,
        photo_url: null,
        raw: {}
      }
    ]);

    expect(result[0].title).toBe("Без названия");
    expect(result[0].district).toBe("—");
    expect(result[0].area).toBe(0);
    expect(result[0].rooms).toBe(0);
  });
});
