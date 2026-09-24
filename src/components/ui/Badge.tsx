import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/labels";

const TONES: Record<Tone, string> = {
  neutral: "bg-mist text-muted ring-line-strong",
  brand: "bg-brand-50 text-brand ring-brand-100",
  accent: "bg-accent-50 text-accent-deep ring-accent/25",
  success: "bg-success-50 text-success ring-success/20",
  warning: "bg-warning-50 text-warning ring-warning/20",
  danger: "bg-danger-50 text-danger ring-danger/20",
};

const DOTS: Record<Tone, string> = {
  neutral: "bg-subtle",
  brand: "bg-brand-bright",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export function Badge({ tone = "neutral", dot = false, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      {dot ? <span className={cn("size-1.5 rounded-full", DOTS[tone])} aria-hidden /> : null}
      {children}
    </span>
  );
}
