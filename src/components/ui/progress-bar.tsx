import { cn } from "@/lib/cn";

export interface ProgressBarProps {
  /** 0–100; values outside are clamped. */
  value: number;
  label?: string;
  className?: string;
}

export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={className}>
      {label && (
        <div className="mb-1 flex justify-between text-xs font-medium text-muted">
          <span>{label}</span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2.5 w-full overflow-hidden rounded-full bg-pale"
      >
        <div
          className={cn("h-full rounded-full bg-accent transition-all")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
