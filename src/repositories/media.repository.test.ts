import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { storage: { from: () => storage } } }));

const { isTransientError, mediaRepository } = await import("./media.repository");

const file = new File(["x"], "Affiche.webp", { type: "image/webp" });

describe("upload Storage — erreurs passagères", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("réessaie après un 504 sur le même chemin, en remplaçant le fichier éventuellement déjà enregistré", async () => {
    storage.upload
      .mockResolvedValueOnce({ error: { statusCode: "504", message: "Gateway Timeout" } })
      .mockResolvedValueOnce({ error: null });

    const pending = mediaRepository.upload("services", "services/svc-1", file);
    await vi.advanceTimersByTimeAsync(2000);
    const path = await pending;

    expect(storage.upload).toHaveBeenCalledTimes(2);
    const [firstPath, , firstOptions] = storage.upload.mock.calls[0]!;
    const [secondPath, , secondOptions] = storage.upload.mock.calls[1]!;
    expect(secondPath).toBe(firstPath);
    expect(firstOptions).toMatchObject({ upsert: false });
    expect(secondOptions).toMatchObject({ upsert: true });
    expect(path).toBe(firstPath);
  });

  it("ne réessaie pas un refus de droits", async () => {
    storage.upload.mockResolvedValueOnce({ error: { statusCode: "403", message: "new row violates row-level security policy" } });
    await expect(mediaRepository.upload("services", "services/svc-1", file)).rejects.toThrow(/droits pour/);
    expect(storage.upload).toHaveBeenCalledTimes(1);
  });

  it("abandonne après 3 tentatives avec un message en français", async () => {
    storage.upload.mockResolvedValue({ error: { statusCode: "504", message: "Gateway Timeout" } });
    const pending = expect(mediaRepository.upload("services", "services/svc-1", file)).rejects.toThrow(/trop de temps à répondre/);
    await vi.advanceTimersByTimeAsync(10_000);
    await pending;
    expect(storage.upload).toHaveBeenCalledTimes(3);
  });

  it("classe les erreurs", () => {
    expect(isTransientError({ statusCode: "504" })).toBe(true);
    expect(isTransientError({ status: 503 })).toBe(true);
    expect(isTransientError({ message: "fetch failed" })).toBe(true);
    expect(isTransientError({ statusCode: "403" })).toBe(false);
    expect(isTransientError(null)).toBe(false);
  });
});
