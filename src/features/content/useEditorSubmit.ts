import type { FieldValues, UseFormReturn } from "react-hook-form";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import type { ContentStatus } from "@/types";

/** Sous-ensemble de useContentEditor utilisé ici. */
type Editor<TRow, TInput> = {
  isNew: boolean;
  item: { data: TRow | undefined };
  save: { mutateAsync: (request: { input: TInput; status: ContentStatus }) => Promise<TRow>; isPending: boolean };
  goToSaved: (row: TRow) => void;
};

/**
 * Soumission d'un formulaire de contenu vers un statut cible
 * (« Enregistrer », « Publier », « Dépublier »…), réinitialisation de l'état
 * « modifié » et protection contre la perte de modifications.
 */
export function useEditorSubmit<TValues extends FieldValues, TRow extends { status: ContentStatus }, TInput>(
  editor: Editor<TRow, TInput>,
  form: UseFormReturn<TValues>,
  toInput: (values: TValues) => TInput,
  toValues: (row: TRow) => TValues,
) {
  const guard = useUnsavedChangesGuard(form.formState.isDirty && !editor.save.isPending);
  const currentStatus: ContentStatus = editor.item.data?.status ?? "draft";

  const submit = (status: ContentStatus = currentStatus) =>
    form.handleSubmit(async (values) => {
      try {
        const row = await editor.save.mutateAsync({ input: toInput(values), status });
        form.reset(toValues(row));
        guard.bypass();
        editor.goToSaved(row);
      } catch {
        // Erreur déjà signalée par un toast (useContentEditor).
      }
    })();

  return { submit, currentStatus, isSaving: editor.save.isPending, isDirty: form.formState.isDirty };
}
