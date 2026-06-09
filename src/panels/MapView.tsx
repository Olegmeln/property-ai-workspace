import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Listing } from "../types";
import { useT } from "../i18n";

export function MapView({ listings }: { listings: Listing[] }) {
  const { t } = useT();
  const mapRef = useRef<HTMLDivElement>(null);
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

  useEffect(() => {
    if (!mapRef.current || !token || listings.length === 0) return;
    mapboxgl.accessToken = token;
    const first = listings[0];
    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [first.lng, first.lat],
      zoom: 11
    });

    listings.forEach((listing) => {
      const element = document.createElement("div");
      element.className = "property-marker";
      element.textContent = Math.round(listing.score).toString();
      new mapboxgl.Marker(element)
        .setLngLat([listing.lng, listing.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`<strong>${listing.title}</strong><br/>Score ${listing.score}`))
        .addTo(map);
    });

    return () => map.remove();
  }, [listings, token]);

  if (!token) {
    return (
      <div className="grid h-full place-items-center rounded-2xl border border-workspace-border bg-[#111620] p-6 text-center">
        <div>
          <p className="text-sm font-semibold text-white">{t("map.noTokenTitle")}</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">{t("map.tokenRequired")}</p>
        </div>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="grid h-full place-items-center rounded-2xl border border-workspace-border bg-[#111620] text-sm text-slate-500">
        {t("map.runHint")}
      </div>
    );
  }

  return <div ref={mapRef} className="h-full overflow-hidden rounded-2xl border border-workspace-border" />;
}
