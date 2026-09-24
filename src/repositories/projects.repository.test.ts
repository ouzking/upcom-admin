import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectImageRow } from "@/types";

const mock = vi.hoisted(() => ({ current: null as null | { from: (table: string) => unknown } }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: (table: string) => mock.current!.from(table) } }));

const { createSupabaseMock } = await import("@/test/supabaseMock");
const { syncProjectGallery } = await import("./projects.repository");

const row = (id: string, path: string, order: number): ProjectImageRow => ({
  id,
  project_id: "p-1",
  image_path: path,
  alt_text: null,
  caption: null,
  display_order: order,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
});

describe("syncProjectGallery (réalisation → project_images)", () => {
  let supabase: ReturnType<typeof createSupabaseMock>;

  beforeEach(() => {
    let reads = 0;
    supabase = createSupabaseMock((call) => {
      if (call.operation === "select") {
        reads += 1;
        // 1re lecture : état en base avant synchronisation ; 2e : état final.
        return reads === 1
          ? { data: [row("img-1", "projects/p-1/a.webp", 0), row("img-2", "projects/p-1/b.webp", 1)], error: null }
          : { data: [row("img-2", "projects/p-1/b.webp", 0), row("img-3", "projects/p-1/c.webp", 1)], error: null };
      }
      return { data: null, error: null };
    });
    mock.current = supabase.client;
  });

  it("supprime les images retirées, réordonne les existantes et insère les nouvelles", async () => {
    const result = await syncProjectGallery("p-1", [
      { id: "img-2", image_path: "projects/p-1/b.webp", alt_text: "Affiche", caption: null },
      { image_path: "projects/p-1/c.webp", alt_text: null, caption: "Vue d'ensemble" },
    ]);

    const writes = supabase.calls.filter((call) => call.operation !== "select");
    expect(writes.map((call) => call.operation)).toEqual(["delete", "upsert", "insert"]);

    expect(writes[0]!.filters).toContainEqual(["in", "id", ["img-1"]]);
    expect(writes[1]!.payload).toEqual([
      { id: "img-2", project_id: "p-1", image_path: "projects/p-1/b.webp", alt_text: "Affiche", caption: null, display_order: 0 },
    ]);
    expect(writes[2]!.payload).toEqual([
      { project_id: "p-1", image_path: "projects/p-1/c.webp", alt_text: null, caption: "Vue d'ensemble", display_order: 1 },
    ]);
    // La galerie renvoyée contient les identifiants des nouvelles images (évite les doublons au prochain enregistrement).
    expect(result.map((image) => image.id)).toEqual(["img-2", "img-3"]);
  });

  it("propage une erreur RLS", async () => {
    supabase = createSupabaseMock((call) =>
      call.operation === "delete" ? { data: null, error: { code: "42501", message: "permission denied for table project_images" } } : { data: [row("img-1", "a", 0)], error: null },
    );
    mock.current = supabase.client;
    await expect(syncProjectGallery("p-1", [])).rejects.toThrow(/droits nécessaires/);
  });
});
