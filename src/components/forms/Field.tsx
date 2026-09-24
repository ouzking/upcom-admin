import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

interface FieldProps {
  label: ReactNode;
  children: ReactElement<{ id?: string; "aria-describedby"?: string; invalid?: boolean }>;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  /** Compteur de caractères (valeur courante / maximum). */
  counter?: { value: number; max: number };
  labelAction?: ReactNode;
}

/** Libellé + contrôle + aide + erreur, reliés pour les lecteurs d'écran. */
export function Field({ label, children, error, hint, required, className, counter, labelAction }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  // `invalid` n'est transmis qu'aux composants (les éléments DOM natifs ne le connaissent pas).
  const control = isValidElement(children)
    ? cloneElement(
        children,
        typeof children.type === "string"
          ? { id, "aria-describedby": describedBy }
          : { id, "aria-describedby": describedBy, invalid: Boolean(error) },
      )
    : children;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-semibold text-ink-soft">
          {label}
          {required ? (
            <span className="ml-0.5 text-accent-deep" aria-hidden>
              *
            </span>
          ) : null}
        </label>
        {labelAction}
      </div>
      {control}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {error ? (
            <p id={errorId} className="flex items-center gap-1.5 text-[13px] font-medium text-danger" role="alert">
              <AlertCircle className="size-3.5 shrink-0" aria-hidden />
              {error}
            </p>
          ) : hint ? (
            <p id={hintId} className="text-[13px] text-muted">
              {hint}
            </p>
          ) : null}
        </div>
        {counter ? (
          <span className={cn("shrink-0 text-xs tabular-nums", counter.value > counter.max ? "font-semibold text-danger" : "text-subtle")}>
            {counter.value}/{counter.max}
          </span>
        ) : null}
      </div>
    </div>
  );
}
