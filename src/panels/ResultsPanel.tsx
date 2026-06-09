import { useMemo } from "react";
import { AllCommunityModule, ModuleRegistry, type ColDef } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { Map, Table2 } from "lucide-react";
import { useWorkspaceStore } from "../store/workspace";
import type { Listing } from "../types";
import { compactCurrency } from "../lib/utils";
import { Button } from "../components/ui/button";
import { MapView } from "./MapView";
import { useT } from "../i18n";

ModuleRegistry.registerModules([AllCommunityModule]);

export function ResultsPanel() {
  const { t } = useT();
  const results = useWorkspaceStore((state) => state.results);
  const view = useWorkspaceStore((state) => state.layout.resultsView);
  const setResultsView = useWorkspaceStore((state) => state.setResultsView);
  const columnDefs = useMemo<ColDef<Listing>[]>(
    () => [
      { field: "title", headerName: t("results.col.listing"), flex: 1.4 },
      { field: "price", valueFormatter: ({ value }) => compactCurrency(Number(value)), width: 140 },
      {
        field: "area",
        headerName: t("results.col.area"),
        valueFormatter: ({ value }) => t("results.col.areaSqft", { value: Number(value) }),
        width: 120
      },
      { field: "rooms", width: 110 },
      { field: "district", width: 140 },
      { field: "score", width: 110 }
    ],
    [t]
  );

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-workspace-border bg-[#0B0E14]">
      <div className="flex h-12 items-center justify-between border-b border-workspace-border px-4">
        <div>
          <h2 className="text-sm font-semibold text-white">{t("results.title")}</h2>
          <p className="text-xs text-slate-500">{t("results.count", { count: results.length })}</p>
        </div>
        <div className="flex gap-2">
          <Button variant={view === "table" ? "primary" : "panel"} size="sm" onClick={() => setResultsView("table")}>
            <Table2 className="h-4 w-4" />
            {t("results.table")}
          </Button>
          <Button variant={view === "map" ? "primary" : "panel"} size="sm" onClick={() => setResultsView("map")}>
            <Map className="h-4 w-4" />
            {t("results.map")}
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 p-3">
        {view === "table" ? (
          <div className="ag-theme-quartz-dark h-full overflow-hidden rounded-2xl border border-workspace-border">
            <AgGridReact<Listing>
              rowData={results}
              columnDefs={columnDefs}
              defaultColDef={{ sortable: true, filter: true, resizable: true }}
              animateRows
            />
          </div>
        ) : (
          <MapView listings={results} />
        )}
      </div>
    </div>
  );
}
