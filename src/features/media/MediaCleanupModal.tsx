import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/feedback/confirm-context";
import { ErrorState, LoadingState } from "@/components/feedback/States";
import { useToast } from "@/components/feedback/toast-context";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatFileSize } from "@/lib/format";
import { BUCKET_RULES, BUCKETS, publicUrl } from "@/lib/storage";
import { siteRepository } from "@/repositories/site.repository";
import type { StorageBucket } from "@/types";

const isBucket = (value: string): value is StorageBucket => BUCKETS.includes(value as StorageBucket);

/**
 * Médias orphelins (Edge Function cleanup-media, backend v0.2.0) : images qui ne
 * sont plus utilisées par aucun contenu ni citées dans un texte. Les fichiers de
 * moins de 24 h et le dossier « Site (logos) » sont toujours conservés.
 * Étape 1 : aperçu (aucune suppression). Étape 2 : suppression après confirmation.
 */
export function MediaCleanupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const confirm = useConfirm();
  const toast = useToast();
  const queryClient = useQueryClient();
  const preview = useQuery({ queryKey: ["media", "orphans"], queryFn: () => siteRepository.cleanupMedia(true), enabled: open, staleTime: 0, gcTime: 0 });

  const cleanup = useMutation({
    mutationFn: () => siteRepository.cleanupMedia(false),
    onSuccess: async (result) => {
      toast.success(`${result.deleted} fichier${result.deleted > 1 ? "s" : ""} supprimé${result.deleted > 1 ? "s" : ""}.`, `${formatFileSize(result.total_bytes)} libérés.`);
      await queryClient.invalidateQueries({ queryKey: ["media"] });
      onClose();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const files = preview.data?.files ?? [];
  const byBucket = files.reduce<Record<string, typeof files>>((groups, file) => {
    (groups[file.bucket] ??= []).push(file);
    return groups;
  }, {});

  const run = async () => {
    const ok = await confirm({
      tone: "danger",
      title: `Supprimer ${files.length} fichier${files.length > 1 ? "s" : ""} inutilisé${files.length > 1 ? "s" : ""} ?`,
      description: "Ces images ne sont utilisées par aucun contenu publié, brouillon ou archivé. Cette action est irréversible.",
      confirmLabel: "Supprimer",
    });
    if (ok) cleanup.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!cleanup.isPending}
      size="lg"
      title="Nettoyer les médias inutilisés"
      description="Images qui ne servent plus à aucun contenu (contenu supprimé, image remplacée…). Les envois de moins de 24 h et les logos du site sont conservés."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={cleanup.isPending}>
            Fermer
          </Button>
          {files.length ? (
            <Button variant="danger" icon={Trash2} loading={cleanup.isPending} onClick={() => void run()}>
              Supprimer {files.length} fichier{files.length > 1 ? "s" : ""} ({formatFileSize(preview.data?.total_bytes)})
            </Button>
          ) : null}
        </>
      }
    >
      {preview.isLoading ? (
        <LoadingState label="Analyse de la médiathèque…" />
      ) : preview.error ? (
        <ErrorState error={preview.error} onRetry={() => void preview.refetch()} />
      ) : !files.length ? (
        <div className="flex flex-col items-center py-10 text-center">
          <CheckCircle2 className="mb-3 size-8 text-success" aria-hidden />
          <p className="font-semibold text-ink">La médiathèque est propre</p>
          <p className="text-sm text-muted">Aucune image inutilisée.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(byBucket).map(([bucket, items]) => (
            <section key={bucket}>
              <h3 className="mb-2 font-sans text-xs font-bold tracking-wide text-muted uppercase">
                {isBucket(bucket) ? BUCKET_RULES[bucket].label : bucket} · {items.length}
              </h3>
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {items.map((file) => (
                  <li key={`${file.bucket}/${file.path}`} className="min-w-0">
                    <div className="aspect-square overflow-hidden rounded-lg bg-mist ring-1 ring-line">
                      {isBucket(bucket) ? <img src={publicUrl(bucket, file.path) ?? ""} alt="" loading="lazy" className="size-full object-cover" /> : null}
                    </div>
                    <p className="mt-1 truncate text-[11px] text-subtle" title={file.path}>
                      {formatFileSize(file.size_bytes)} · {formatDate(file.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Modal>
  );
}
