import { useCallback, useEffect, useRef } from "react";
import { useBlocker } from "react-router";
import { useConfirm } from "@/components/feedback/confirm-context";

/**
 * Avertit avant de quitter une page dont le formulaire contient des
 * modifications non enregistrées (navigation interne et fermeture d'onglet).
 * `bypass()` autorise la prochaine navigation (ex. redirection après création).
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  const confirm = useConfirm();
  const bypassRef = useRef(false);

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) =>
        isDirty && !bypassRef.current && currentLocation.pathname !== nextLocation.pathname,
      [isDirty],
    ),
  );

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    let cancelled = false;
    void confirm({
      title: "Quitter sans enregistrer ?",
      description: "Les modifications non enregistrées seront perdues.",
      confirmLabel: "Quitter la page",
      cancelLabel: "Rester",
      tone: "danger",
    }).then((ok) => {
      if (cancelled) return;
      if (ok) blocker.proceed();
      else blocker.reset();
    });
    return () => {
      cancelled = true;
    };
  }, [blocker, confirm]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  return {
    bypass: () => {
      bypassRef.current = true;
      window.setTimeout(() => {
        bypassRef.current = false;
      }, 0);
    },
  };
}
