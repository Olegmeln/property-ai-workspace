import * as React from "react";
import { cn } from "../../lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-20 w-full resize-none rounded-xl border border-workspace-border bg-[#121722] px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-workspace-accent",
        className
      )}
      {...props}
    />
  );
}
