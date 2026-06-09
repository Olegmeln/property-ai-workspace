/**
 * Минимальный модальный диалог. Без зависимостей (radix/headless-ui — оверкилл
 * для одного диалога). Закрывается по Esc, по клику на оверлей, по кнопке.
 * Рендерится через createPortal в document.body, чтобы не зависеть от
 * z-index/overflow родительских контейнеров.
 */

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Максимальная ширина по дизайну: sm | md | lg */
  size?: "sm" | "md" | "lg";
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = "md" }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Блокируем прокрутку фона, пока модал открыт.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Перенос фокуса в модал на маунт.
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass =
    size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : "max-w-xl";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Dialog */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          "relative w-full overflow-hidden rounded-2xl border border-workspace-border bg-[#0F1320] shadow-panel outline-none",
          sizeClass
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || subtitle) && (
          <header className="flex items-start justify-between gap-4 border-b border-workspace-border p-5">
            <div className="min-w-0">
              {title && (
                <h2 id="modal-title" className="text-base font-semibold text-white">
                  {title}
                </h2>
              )}
              {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1 text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </header>
        )}
        <div className="max-h-[70vh] overflow-auto p-5">{children}</div>
        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-workspace-border bg-[#0B0E14]/50 p-4">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}
