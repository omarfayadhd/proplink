import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "outline" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

/**
 * `primary` is **ink, not accent** (ADR-009). Under the old navy palette the
 * accent was electric blue and `primary` reading blue while `danger` read red
 * kept them a hemisphere apart. The accent is now terracotta, which put the
 * main action and the destructive one in the same colour family — a real
 * hazard, not a taste call — and left the app's most important button
 * disagreeing with every CTA on the marketing surface, all of which are ink.
 *
 * So ink is the action and ember is the *response* to one: it carries hovers,
 * focus, selection and progress, where it never sits next to `danger`.
 */
const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-accent",
  secondary: "border border-line bg-pale text-primary hover:bg-line",
  outline: "border border-line bg-white text-primary hover:border-accent",
  danger: "bg-danger text-white hover:opacity-90",
  ghost: "text-secondary hover:bg-pale",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
