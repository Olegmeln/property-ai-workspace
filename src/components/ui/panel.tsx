import * as React from "react";
import { cn } from "../../lib/utils";

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn("border border-workspace-border bg-workspace-card shadow-panel", className)}
      {...props}
    />
  );
}
