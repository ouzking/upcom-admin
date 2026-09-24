import { cn } from "@/lib/cn";

/** Classes communes des champs de saisie. */
export const controlClass = (invalid?: boolean) =>
  cn(
    "w-full rounded-xl border bg-paper px-3.5 text-sm text-ink placeholder:text-subtle transition-colors",
    "focus:border-brand-bright focus:ring-4 focus:ring-brand-bright/10 focus:outline-none",
    "disabled:cursor-not-allowed disabled:bg-mist disabled:text-muted read-only:bg-mist",
    invalid ? "border-danger focus:border-danger focus:ring-danger/10" : "border-line-strong hover:border-subtle",
  );
