import { EDGE_FUNCTIONS } from "@upcom/supabase";
import type { CleanupMediaResult, TriggerSiteRebuildResult } from "@upcom/supabase";
import { invokeFunction } from "./functions";

/** Opérations serveur du back-office (Edge Functions, backend v0.2.0). */
export const siteRepository = {
  /** Régénère le site public (pages pré-rendues + sitemap) via le build hook Netlify, secret côté serveur. */
  triggerRebuild: () => invokeFunction<TriggerSiteRebuildResult>(EDGE_FUNCTIONS.triggerSiteRebuild, {}),

  /** Images plus utilisées par aucun contenu. `dryRun` (défaut) : liste sans supprimer. */
  cleanupMedia: (dryRun = true) => invokeFunction<CleanupMediaResult>(EDGE_FUNCTIONS.cleanupMedia, { dry_run: dryRun }),
};
