import { Lock } from "lucide-react";

/** Affiché quand l'utilisateur peut consulter une rubrique sans pouvoir la modifier. */
export function ReadOnlyNotice({ text }: { text?: string }) {
  return (
    <div className="mb-5 flex items-center gap-3 rounded-xl border border-line bg-paper px-4 py-3 text-sm text-muted shadow-card">
      <Lock className="size-4 shrink-0 text-subtle" aria-hidden />
      {text ?? "Consultation seule : votre rôle ne permet pas de modifier cette rubrique."}
    </div>
  );
}
