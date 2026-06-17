import { ExternalLink, MapPin } from "lucide-react";
import type { ProjectListingResult } from "./types";

interface ListingCardProps {
  listing: ProjectListingResult;
}

export function ListingCard({ listing }: ListingCardProps) {
  return (
    <a
      href={listing.url ?? "#"}
      target={listing.url ? "_blank" : undefined}
      rel="noreferrer"
      className="group flex flex-col overflow-hidden rounded-2xl border border-workspace-border bg-workspace-card transition hover:border-workspace-accent/60"
    >
      {/* Photo */}
      <div className="aspect-[16/10] w-full overflow-hidden bg-[#0B0E14]">
        {listing.photo_url ? (
          <img
            src={listing.photo_url}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-700">
            <MapPin className="h-8 w-8" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-sm font-semibold text-white">
            {formatPrice(listing.price)} {listing.currency}
          </div>
          {listing.score !== undefined && (
            <div className="rounded-full bg-workspace-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-workspace-accent">
              {Math.round(listing.score)}
            </div>
          )}
        </div>
        <h4 className="mt-1 line-clamp-2 text-sm leading-5 text-slate-200">
          {listing.title}
        </h4>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
          {listing.district && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {listing.district}
            </span>
          )}
          {listing.rooms !== undefined && (
            <span className="rounded-full bg-[#0B0E14] px-1.5 py-0.5">
              {listing.rooms} комн.
            </span>
          )}
          {listing.area_m2 !== undefined && (
            <span className="rounded-full bg-[#0B0E14] px-1.5 py-0.5">
              {Math.round(listing.area_m2)} м²
            </span>
          )}
        </div>
        {listing.reasoning && (
          <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-slate-500">
            {listing.reasoning}
          </p>
        )}
        {listing.url && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-workspace-accent opacity-0 transition group-hover:opacity-100">
            <ExternalLink className="h-3 w-3" />
            Открыть на источнике
          </div>
        )}
      </div>
    </a>
  );
}

function formatPrice(value: number): string {
  if (value >= 1_000_000) {
    return (value / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (value >= 1_000) {
    return Math.round(value / 1_000) + "K";
  }
  return String(Math.round(value));
}
