import { useEffect, useState } from "react";
import { CircleDot, WifiOff } from "lucide-react";
import { useT } from "../i18n";

type Status = "connected" | "disconnected" | "checking";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "";

export function OnlineIndicator() {
  const { t } = useT();
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let alive = true;
    const check = async () => {
      if (!API_BASE) {
        if (alive) setStatus("disconnected");
        return;
      }
      try {
        const r = await fetch(`${API_BASE}/health/llm`, { method: "GET" });
        if (!alive) return;
        if (r.ok) {
          const json = await r.json();
          setStatus(json.enabled ? "connected" : "disconnected");
        } else {
          setStatus("disconnected");
        }
      } catch {
        if (alive) setStatus("disconnected");
      }
    };
    check();
    // Render free tier sleeps after 15 min; periodically re-check.
    const id = setInterval(check, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const label =
    status === "connected"
      ? t("online.connected")
      : status === "disconnected"
        ? t("online.disconnected")
        : t("online.checking");

  return (
    <div
      className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium ${
        status === "connected"
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          : status === "disconnected"
            ? "border-rose-500/40 bg-rose-500/5 text-rose-300"
            : "border-workspace-border bg-workspace-card text-slate-400"
      }`}
      title={status === "connected" ? "API + LLM reachable" : "API or LLM unreachable"}
    >
      {status === "disconnected" ? (
        <WifiOff className="h-3.5 w-3.5" />
      ) : (
        <CircleDot
          className={`h-3.5 w-3.5 ${status === "connected" ? "text-emerald-400" : "text-slate-500"}`}
        />
      )}
      <span>{label}</span>
    </div>
  );
}
