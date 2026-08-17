import { afterEach, describe, expect, it, vi } from "vitest";
import { searchListings } from "./client";

describe("searchListings", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts a RefinedQuery to /search and maps the RawListing response back to Listing[]", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        strategy: { sources: [], rationale: null },
        listings: [
          {
            source: "list-am-browser",
            external_id: "1",
            title: "Test",
            url: null,
            country: "AM",
            city: "Yerevan",
            district: "Center",
            lat: null,
            lng: null,
            price: 100000,
            currency: "USD",
            area_m2: 50,
            rooms: 2,
            property_kind: "apartment",
            photo_url: null,
            raw: {}
          }
        ]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchListings(
      { city: "Yerevan", budget_max: 150000, rooms_min: 2, districts: ["Center"] },
      {}
    );

    expect(result).toEqual([
      {
        id: "list-am-browser:1",
        title: "Test",
        price: 100000,
        area: 50,
        rooms: 2,
        district: "Center",
        lat: 0,
        lng: 0,
        score: 0
      }
    ]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/search");
    const body = JSON.parse(init.body as string);
    expect(body.query.country).toBe("AM");
  });
});
