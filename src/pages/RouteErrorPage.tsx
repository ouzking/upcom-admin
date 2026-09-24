import { isRouteErrorResponse, useRouteError } from "react-router";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";

/** Erreur de rendu ou de chargement d'un écran (ex. nouvelle version déployée). */
export function RouteErrorPage() {
  const error = useRouteError();
  const chunkError = error instanceof Error && /dynamically imported module|Importing a module script failed/i.test(error.message);
  if (import.meta.env.DEV) console.error(error);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-mist px-6">
      <div className="max-w-md text-center">
        <span className="mx-auto mb-5 inline-flex size-14 items-center justify-center rounded-2xl bg-danger-50 text-danger">
          <AlertTriangle className="size-7" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold text-ink">{isRouteErrorResponse(error) && error.status === 404 ? "Page introuvable" : "Une erreur est survenue."}</h1>
        <p className="mt-2 text-sm text-muted">
          {chunkError
            ? "Une nouvelle version du back-office est disponible. Rechargez la page pour continuer."
            : "L'écran n'a pas pu s'afficher. Rechargez la page ou revenez au tableau de bord."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button icon={RotateCw} onClick={() => window.location.reload()}>
            Recharger
          </Button>
          <ButtonLink to="/" variant="secondary" reloadDocument>
            Tableau de bord
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
