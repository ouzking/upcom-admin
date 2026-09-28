import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/feedback/toast-context";
import { errorMessage } from "@/lib/errors";
import { optimizeImage } from "@/lib/imageCompression";
import { BUCKET_RULES, formatMimeList, validateFile } from "@/lib/storage";
import { mediaRepository } from "@/repositories/media.repository";
import type { StorageBucket } from "@/types";

/**
 * Téléversement vers un bucket Storage :
 * 1. format vérifié immédiatement ;
 * 2. image optimisée (redimensionnée, WebP) — une photo trop lourde devient acceptable ;
 * 3. taille vérifiée sur le fichier optimisé, puis envoi.
 * Storage revalide côté serveur (types MIME, taille, permission du bucket).
 * Renvoie les chemins des fichiers envoyés avec succès.
 */
export function useUpload(bucket: StorageBucket) {
  const [pending, setPending] = useState(0);
  const toast = useToast();
  const queryClient = useQueryClient();

  const upload = async (files: File[], folder: string): Promise<string[]> => {
    const accepted = files.filter((file) => {
      if (BUCKET_RULES[bucket].mimeTypes.includes(file.type)) return true;
      toast.error("Fichier refusé", `Format non autorisé (${file.name}). Formats acceptés : ${formatMimeList(BUCKET_RULES[bucket].mimeTypes)}.`);
      return false;
    });
    if (!accepted.length) return [];

    setPending((count) => count + accepted.length);
    const results = await Promise.all(
      accepted.map(async (original) => {
        try {
          const file = await optimizeImage(original);
          const problem = validateFile(bucket, file);
          if (problem) {
            toast.error("Fichier refusé", problem);
            return null;
          }
          return await mediaRepository.upload(bucket, folder, file);
        } catch (error) {
          toast.error(`Échec de l'envoi de ${original.name}`, errorMessage(error));
          return null;
        } finally {
          setPending((count) => count - 1);
        }
      }),
    );
    void queryClient.invalidateQueries({ queryKey: ["media", bucket] });
    return results.filter((path): path is string => path !== null);
  };

  return { upload, uploading: pending > 0, pending };
}
