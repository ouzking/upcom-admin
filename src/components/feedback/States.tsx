import type { ReactNode } from "react";
import { AlertCircle, Inbox, Lock, RotateCw, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { errorMessage } from "@/lib/errors";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand">
        <Icon className="size-6" aria-hidden />
      </span>
      <h3 className="font-sans text-base font-bold tracking-normal text-ink">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-danger-50 text-danger">
        <AlertCircle className="size-6" aria-hidden />
      </span>
      <h3 className="font-sans text-base font-bold tracking-normal text-ink">Chargement impossible</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{errorMessage(error)}</p>
      {onRetry ? (
        <Button variant="secondary" icon={RotateCw} className="mt-5" onClick={onRetry}>
          Réessayer
        </Button>
      ) : null}
    </div>
  );
}

export function ForbiddenState({ description }: { description?: string }) {
  return (
    <EmptyState
      icon={Lock}
      title="Accès réservé"
      description={description ?? "Votre rôle ne donne pas accès à cette rubrique. Contactez un super administrateur si nécessaire."}
    />
  );
}

export function LoadingState({ label = "Chargement…", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-3 py-16 text-sm text-muted", className)}>
      <Spinner className="text-brand" />
      {label}
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-y divide-line" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="size-10 shrink-0 rounded-xl" />
          {Array.from({ length: columns }, (_, column) => (
            <Skeleton key={column} className={cn("h-4", column === 0 ? "w-1/3" : "hidden w-24 md:block")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-mist">
      <Spinner className="size-7 text-brand" label="Chargement de l'application" />
    </div>
  );
}
