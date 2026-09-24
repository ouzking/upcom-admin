import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/feedback/toast-context";
import { errorMessage } from "@/lib/errors";
import { validateFile } from "@/lib/storage";
import { mediaRepository } from "@/repositories/media.repository";
import type { StorageBucket } from "@/types";

/**
 * Téléversement vers un bucket Storage : validation immédiate (format, taille)
 * puis envoi. Storage revalide côté serveur (types MIME, taille, permission).
 * Renvoie les chemins des fichiers envoyés avec succès.
 */
export function useUpload(bucket: StorageBucket) {
  const [pending, setPending] = useState(0);
  const toast = useToast();
  const queryClient = useQueryClient();

  const upload = async (files: File[], folder: string): Promise<string[]> => {
    const accepted: File[] = [];
    for (const file of files) {
      const problem = validateFile(bucket, file);
      if (problem) toast.error("Fichier refusé", problem);
      else accepted.push(file);
    }
    if (!accepted.length) return [];

    setPending((count) => count + accepted.length);
    const results = await Promise.all(
      accepted.map(async (file) => {
        try {
          return await mediaRepository.upload(bucket, folder, file);
        } catch (error) {
          toast.error(`Échec de l'envoi de ${file.name}`, errorMessage(error));
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
