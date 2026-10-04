"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * A labelled button that opens a panel beneath it — the filter bar's unit
 * (ADR-020).
 *
 * Deliberately not a `<details>`: a filter popover must close on Escape, on an
 * outside click, and when a sibling opens, and `<details>` gives none of those.
 * It is also not a `<dialog>`, because it must not trap focus or block the page
 * — a buyer adjusting the budget should see the result count move behind it.
 *
 * Accessibility: the trigger owns `aria-expanded`/`aria-controls`, so a screen
 * reader announces the panel's state; focus is *not* moved into the panel on
 * open, matching native disclosure behaviour, but Escape returns focus to the
 * trigger so keyboard users are never stranded.
 */
export function Popover({
  label,
  summary,
  active = false,
  align = "start",
  panelClassName,
  children,
}: {
  label: string;
  /** Replaces the label when a filter is set, e.g. "Up to £320,000". */
  summary?: string;
  /** Renders the trigger as selected — it is narrowing the search. */
  active?: boolean;
  align?: "start" | "end";
  panelClassName?: string;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
          active
            ? "border-primary bg-primary text-white"
            : "border-line bg-white text-body hover:border-primary hover:text-primary",
        )}
      >
        {summary ?? label}
        <span
          aria-hidden
          className={cn("text-[10px] transition-transform", open && "rotate-180")}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          className={cn(
            "absolute top-[calc(100%+0.5rem)] z-30 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-line bg-white p-5 shadow-[0_12px_40px_-12px_rgba(27,31,30,0.28)]",
            align === "end" ? "right-0" : "left-0",
            panelClassName,
          )}
        >
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}
