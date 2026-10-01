import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { PASSWORD_RULES, passwordScore } from "./password";

const LEVELS = [
  { label: "Trop faible", tone: "bg-danger", text: "text-danger" },
  { label: "Faible", tone: "bg-danger", text: "text-danger" },
  { label: "Moyen", tone: "bg-warning", text: "text-warning" },
  { label: "Bon", tone: "bg-brand-bright", text: "text-brand-bright" },
  { label: "Excellent", tone: "bg-success", text: "text-success" },
] as const;

/** Indicateur de force + règles exigées, cochées au fil de la saisie. */
export function PasswordStrength({ value }: { value: string }) {
  const score = passwordScore(value);
  const level = LEVELS[score]!;

  return (
    <div className="space-y-2.5" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden>
          {[1, 2, 3, 4].map((step) => (
            <span key={step} className={cn("h-1.5 rounded-full transition-colors", score >= step ? level.tone : "bg-line")} />
          ))}
        </div>
        <span className={cn("w-20 text-right text-xs font-semibold", value ? level.text : "text-subtle")}>
          {value ? level.label : "—"}
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-1.5 text-[13px]" aria-label="Règles du mot de passe">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(value);
          return (
            <li key={rule.label} className={cn("flex items-center gap-1.5", ok ? "text-success" : "text-muted")}>
              <Check className={cn("size-3.5", ok ? "opacity-100" : "opacity-30")} aria-hidden />
              {rule.label}
              <span className="sr-only">{ok ? " : respecté" : " : non respecté"}</span>
            </li>
          );
        })}
      </ul>
      {score === 3 ? <p className="text-xs text-muted">Conseil : 16 caractères ou un caractère spécial renforcent encore le mot de passe.</p> : null}
    </div>
  );
}
