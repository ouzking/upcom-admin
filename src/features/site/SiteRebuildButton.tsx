import { useMutation } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";
import { useToast } from "@/components/feedback/toast-context";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/auth-context";
import { cn } from "@/lib/cn";
import { errorMessage } from "@/lib/errors";
import { siteRepository } from "@/repositories/site.repository";
import type { AppPermission } from "@/types";

/** Mêmes permissions que l'Edge Function trigger-site-rebuild (toute permission de contenu). */
const CONTENT_PERMISSIONS: AppPermission[] = [
  "services.manage",
  "projects.manage",
  "articles.manage",
  "events.manage",
  "team.manage",
  "testimonials.manage",
  "settings.manage",
];

/**
 * « Mettre à jour le site » : régénère les pages pré-rendues et le sitemap du site
 * public (référencement). Les contenus publiés sont visibles immédiatement sans
 * cette action ; elle sert à ce que Google découvre les nouvelles pages.
 */
export function SiteRebuildButton({ className, variant = "link", onDone }: { className?: string; variant?: "link" | "primary"; onDone?: () => void }) {
  const { can } = useAuth();
  const toast = useToast();
  const rebuild = useMutation({
    mutationFn: siteRepository.triggerRebuild,
    onSuccess: (result) => {
      if (result.status === "triggered" || result.reason === "recently_triggered") onDone?.();
      if (result.status === "triggered") toast.success("Mise à jour du site lancée.", "Les pages et le plan du site seront régénérés d'ici 2 à 3 minutes.");
      else if (result.reason === "recently_triggered") toast.info("Mise à jour déjà en cours", "Une mise à jour a été lancée il y a moins d'une minute.");
      else toast.info("Mise à jour automatique non configurée", "Contactez l'administrateur technique (lien de reconstruction Netlify).");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (!CONTENT_PERMISSIONS.some(can)) return null;

  if (variant === "primary") {
    return (
      <Button icon={RefreshCcw} loading={rebuild.isPending} onClick={() => rebuild.mutate()} className={className}>
        Mettre le site à jour
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => rebuild.mutate()}
      disabled={rebuild.isPending}
      title="Régénère les pages et le plan du site public pour le référencement (2 à 3 min)"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-muted transition-colors hover:bg-brand-50 hover:text-brand disabled:opacity-60",
        className,
      )}
    >
      <RefreshCcw className={cn("size-3.5", rebuild.isPending && "animate-spin")} aria-hidden />
      <span>{rebuild.isPending ? "Lancement…" : "Mettre à jour le site"}</span>
    </button>
  );
}
