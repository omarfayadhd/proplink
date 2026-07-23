"use client";

import { cn } from "@/lib/cn";

export interface MultiSelectOption {
  value: string;
  label: string;
}

export interface MultiSelectProps {
  label?: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
}

/** Chip-toggle multi-select — built for the 8 distress tags but generic. */
export function MultiSelect({
  label,
  options,
  value,
  onChange,
  className,
}: MultiSelectProps) {
  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  }

  return (
    <div className={className}>
      {label && <p className="text-sm font-medium text-body">{label}</p>}
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((o) => {
          const selected = value.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(o.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                selected
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-white text-secondary hover:border-accent",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
