import * as React from "react";
import { cn } from "../../lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "panel";
  size?: "sm" | "md" | "icon";
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus:outline-none focus:ring-2 focus:ring-workspace-accent disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-workspace-accent text-slate-950 hover:bg-[#73b7ff]",
        variant === "ghost" && "text-slate-300 hover:bg-white/5 hover:text-white",
        variant === "panel" && "border border-workspace-border bg-workspace-card text-slate-100 hover:border-workspace-accent/70",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "icon" && "h-9 w-9 p-0",
        className
      )}
      {...props}
    />
  );
}
