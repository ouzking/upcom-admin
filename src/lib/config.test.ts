import { describe, expect, it } from "vitest";
import { configurationProblem } from "@/config/env";
import { authLinkErrorMessage, parseAuthLink } from "./authLink";
import { AppError, assertAffected, toAppError } from "./errors";

describe("configuration Supabase (vérifiée au démarrage)", () => {
  const key = "sb_publishable_abc123";

  it("accepte le projet hébergé", () => {
    expect(configurationProblem("https://gopjiglltfohtzeqijsq.supabase.co", key, true)).toBeNull();
  });

  it("refuse une configuration absente", () => {
    expect(configurationProblem(null, key, true)).toBe("missing");
    expect(configurationProblem("https://x.supabase.co", null, true)).toBe("missing");
  });

  it("refuse la base locale en production (plus de repli vers 127.0.0.1)", () => {
    expect(configurationProblem("http://127.0.0.1:54321", key, true)).toBe("local_url_in_production");
    expect(configurationProblem("http://localhost:54321", key, true)).toBe("local_url_in_production");
    expect(configurationProblem("http://127.0.0.1:54321", key, false)).toBeNull();
  });

  it("refuse une clé secrète", () => {
    expect(configurationProblem("https://x.supabase.co", "sb_secret_abc", true)).toBe("secret_key");
    const serviceRole = `x.${btoa(JSON.stringify({ role: "service_role" }))}.y`;
    expect(configurationProblem("https://x.supabase.co", serviceRole, true)).toBe("secret_key");
  });

  it("refuse une URL invalide", () => {
    expect(configurationProblem("pas-une-url", key, true)).toBe("invalid_url");
  });
});

describe("lien d'authentification reçu par e-mail", () => {
  it("détecte une invitation et une réinitialisation", () => {
    expect(parseAuthLink("#access_token=a&type=invite", "").type).toBe("invite");
    expect(parseAuthLink("#access_token=a&type=recovery", "").type).toBe("recovery");
  });

  it("explique un lien expiré en français", () => {
    const info = parseAuthLink("#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired", "");
    expect(authLinkErrorMessage(info)).toBe("Ce lien a expiré ou a déjà été utilisé. Demandez un nouvel e-mail.");
    expect(authLinkErrorMessage(parseAuthLink("", ""))).toBeNull();
  });
});

describe("messages d'erreur Auth en français", () => {
  it.each([
    [{ code: "same_password", message: "New password should be different from the old password." }, /différent de l'ancien/],
    [{ code: "weak_password", message: "Password should be at least 12 characters." }, /trop faible/],
    [{ code: "over_email_send_rate_limit", message: "For security purposes, you can only request this after 42 seconds." }, /patientez/],
    [{ code: "email_provider_disabled", message: "Email logins are disabled" }, /désactivée/],
    [{ message: "Auth session missing!" }, /session a expiré/],
  ])("%o", (error, expected) => {
    expect(toAppError(error).message).toMatch(expected);
  });
});

describe("écritures filtrées par la RLS", () => {
  it("0 ligne affectée = refus explicite (plus de faux « Modification enregistrée »)", () => {
    expect(() => assertAffected({ data: [], error: null })).toThrow(AppError);
    expect(() => assertAffected({ data: [], error: null })).toThrow(/votre rôle ne permet pas/);
    expect(() => assertAffected({ data: [{ id: "1" }], error: null })).not.toThrow();
  });

  it("erreur 42501 explicite", () => {
    expect(toAppError({ code: "42501", message: 'new row violates row-level security policy for table "services"' }).message).toMatch(/droits nécessaires/);
  });
});
