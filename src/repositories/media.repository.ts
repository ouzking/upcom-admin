import { AppError, assertOk, toAppError } from "@/lib/errors";
import { buildStoragePath } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import type { StorageBucket } from "@/types";

export interface MediaFolder {
  kind: "folder";
  name: string;
  path: string;
}

export interface MediaFile {
  kind: "file";
  name: string;
  path: string;
  size: number | null;
  mimeType: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export type MediaEntry = MediaFolder | MediaFile;

const PAGE_LIMIT = 200;

const joinPath = (folder: string, name: string): string => (folder ? `${folder.replace(/\/+$/, "")}/${name}` : name);

const readNumber = (value: unknown): number | null => (typeof value === "number" ? value : null);
const readString = (value: unknown): string | null => (typeof value === "string" ? value : null);

/**
 * Médiathèque : Supabase Storage (7 buckets publics du backend).
 * Listing réservé aux membres du back-office, écriture selon la permission
 * du bucket (policies storage.objects → private.can_write_bucket).
 */
export const mediaRepository = {
  async list(bucket: StorageBucket, folder: string, search?: string): Promise<MediaEntry[]> {
    const { data, error } = await supabase.storage.from(bucket).list(folder, {
      limit: PAGE_LIMIT,
      sortBy: { column: "name", order: "asc" },
      ...(search?.trim() ? { search: search.trim() } : {}),
    });
    if (error) throw toAppError(error);

    const entries: MediaEntry[] = [];
    for (const item of data ?? []) {
      if (item.name === ".emptyFolderPlaceholder") continue;
      const path = joinPath(folder, item.name);
      // Les « dossiers » Storage n'ont pas d'id (préfixes virtuels).
      if (!item.id) {
        entries.push({ kind: "folder", name: item.name, path });
        continue;
      }
      const metadata: Record<string, unknown> = item.metadata ?? {};
      entries.push({
        kind: "file",
        name: item.name,
        path,
        size: readNumber(metadata.size),
        mimeType: readString(metadata.mimetype),
        createdAt: item.created_at ?? null,
        updatedAt: item.updated_at ?? null,
      });
    }
    // Dossiers d'abord, puis fichiers du plus récent au plus ancien.
    return entries.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
      if (a.kind === "file" && b.kind === "file") return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
      return a.name.localeCompare(b.name, "fr");
    });
  },

  /** Téléverse un fichier sous `<folder>/<horodatage>-<nom-nettoyé>.<ext>` et renvoie son chemin. */
  async upload(bucket: StorageBucket, folder: string, file: File): Promise<string> {
    const path = buildStoragePath(folder, file.name);
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throw toAppError(error);
    return path;
  },

  async remove(bucket: StorageBucket, paths: string[]): Promise<void> {
    if (!paths.length) return;
    const { data, error } = await supabase.storage.from(bucket).remove(paths);
    assertOk({ error });
    // Storage renvoie la liste des objets réellement supprimés : une liste vide
    // signifie que la policy a refusé l'opération.
    if (!data?.length) throw new AppError("Vous n'avez pas les droits nécessaires pour supprimer ce fichier.", { code: "forbidden" });
  },
};
