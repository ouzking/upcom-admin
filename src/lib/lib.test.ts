import { describe, expect, it } from "vitest";
import { AppError, toAppError, unwrap } from "./errors";
import { formatFileSize, fromDateTimeLocal, initials, slugify, toDateTimeLocal } from "./format";
import { emptyToNull, pageRange, searchFilter } from "./query";
import { publicUrl, validateFile } from "./storage";

describe("slugify (aligné sur private.slugify)", () => {
  it("gère les accents, ligatures et ponctuation", () => {
    expect(slugify("Événement été 2026")).toBe("evenement-ete-2026");
    expect(slugify("  Cœur & Âme — Studio  ")).toBe("coeur-ame-studio");
    expect(slugify("Identité visuelle & création graphique")).toBe("identite-visuelle-creation-graphique");
  });
});

describe("recherche PostgREST", () => {
  it("construit un filtre or() multi-colonnes", () => {
    expect(searchFilter(["title", "slug"], "logo")).toBe("title.ilike.*logo*,slug.ilike.*logo*");
  });

  it("neutralise les caractères réservés (pas d'injection de filtre)", () => {
    expect(searchFilter(["title"], "a,b),status.eq.draft")).toBe("title.ilike.*a b status.eq.draft*");
    expect(searchFilter(["title"], "100%_*")).toBe("title.ilike.*100*");
    expect(searchFilter(["title"], "   ")).toBeNull();
  });

  it("calcule les bornes de pagination", () => {
    expect(pageRange(1, 20)).toEqual([0, 19]);
    expect(pageRange(3, 20)).toEqual([40, 59]);
  });

  it("convertit les chaînes vides en NULL", () => {
    expect(emptyToNull({ a: " ", b: " x ", c: 3 })).toEqual({ a: null, b: "x", c: 3 });
  });
});

describe("erreurs", () => {
  it("traduit un refus RLS", () => {
    expect(toAppError({ code: "42501", message: "new row violates row-level security policy" }).message).toMatch(/droits nécessaires/);
  });

  it("conserve le message métier des triggers de garde", () => {
    expect(toAppError({ code: "42501", message: "Impossible de retirer le dernier super_admin actif." }).message).toBe(
      "Impossible de retirer le dernier super_admin actif.",
    );
  });

  it("identifie un slug déjà utilisé", () => {
    const error = toAppError({ code: "23505", message: 'duplicate key value violates unique constraint "services_slug_key"' });
    expect(error.field).toBe("slug");
    expect(error.message).toMatch(/slug est déjà utilisé/);
  });

  it("traduit les identifiants invalides", () => {
    expect(toAppError({ message: "Invalid login credentials", status: 400 }).message).toBe("Adresse e-mail ou mot de passe incorrect.");
  });

  it("message générique par défaut", () => {
    expect(toAppError(new Error("boom")).message).toBe("Une erreur est survenue.");
  });

  it("unwrap lève une AppError", () => {
    expect(() => unwrap({ data: null, error: { code: "PGRST116" } })).toThrow(AppError);
    expect(unwrap({ data: [1], error: null })).toEqual([1]);
  });
});

describe("formatage", () => {
  it("initiales et tailles", () => {
    expect(initials("Awa Ndiaye Diop")).toBe("AD");
    expect(initials("")).toBe("?");
    expect(formatFileSize(2048)).toBe("2 Ko");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5,0 Mo");
  });

  it("aller-retour datetime-local ⇄ ISO", () => {
    const iso = "2026-12-01T09:30:00.000Z";
    expect(fromDateTimeLocal(toDateTimeLocal(iso))).toBe(iso);
    expect(fromDateTimeLocal("")).toBeNull();
  });
});

describe("Storage", () => {
  const file = (name: string, type: string, size: number) => new File([new Uint8Array(size)], name, { type });

  it("accepte une image conforme", () => {
    expect(validateFile("services", file("photo.webp", "image/webp", 1000))).toBeNull();
  });

  it("refuse un format non autorisé", () => {
    expect(validateFile("services", file("doc.pdf", "application/pdf", 1000))).toMatch(/Format non autorisé/);
    expect(validateFile("services", file("logo.svg", "image/svg+xml", 1000))).toMatch(/Format non autorisé/);
    expect(validateFile("site-assets", file("logo.svg", "image/svg+xml", 1000))).toBeNull();
  });

  it("refuse un fichier trop lourd (limite du bucket)", () => {
    expect(validateFile("testimonials", file("big.jpg", "image/jpeg", 3 * 1024 * 1024))).toMatch(/2 Mo/);
    expect(validateFile("projects", file("big.jpg", "image/jpeg", 3 * 1024 * 1024))).toBeNull();
  });

  it("construit l'URL publique à partir du chemin", () => {
    expect(publicUrl("services", "services/abc/1-photo été.webp")).toBe(
      "http://127.0.0.1:54321/storage/v1/object/public/services/services/abc/1-photo%20%C3%A9t%C3%A9.webp",
    );
    expect(publicUrl("services", null)).toBeNull();
  });
});
