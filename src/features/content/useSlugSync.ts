import { useEffect, useRef } from "react";
import { useWatch, type FieldValues, type Path, type PathValue, type UseFormReturn } from "react-hook-form";
import { slugify } from "@/lib/format";

/**
 * Propose le slug à partir du titre tant que l'utilisateur ne l'a pas saisi
 * lui-même (création uniquement : on ne modifie jamais l'URL d'un contenu existant).
 */
export function useSlugSync<TValues extends FieldValues>(form: UseFormReturn<TValues>, source: Path<TValues>, target: Path<TValues>, enabled: boolean) {
  const manual = useRef(false);
  const title: unknown = useWatch({ control: form.control, name: source });

  useEffect(() => {
    if (!enabled || manual.current) return;
    form.setValue(target, slugify(typeof title === "string" ? title : "").slice(0, 120) as PathValue<TValues, Path<TValues>>, { shouldDirty: true });
  }, [enabled, form, target, title]);

  return {
    onManualEdit: () => {
      manual.current = true;
    },
  };
}
