import { describe, expect, it } from "vitest";
import { visibleNavigation } from "@/config/navigation";
import { accessFor } from "@/test/fakes";
import { assignableRoles, can, canWriteBucket } from "./permissions";

const labelsFor = (role: Parameters<typeof accessFor>[0]) =>
  visibleNavigation((permission) => can(accessFor(role), permission)).flatMap((section) => section.items.map((item) => item.label));

describe("permissions (miroir de la matrice role_permissions)", () => {
  it("super_admin possède toutes les permissions", () => {
    const access = { role: "super_admin" as const, permissions: [] };
    expect(can(access, "users.manage")).toBe(true);
    expect(can(access, "quotes.manage")).toBe(true);
  });

  it("refuse tout sans accès (visiteur ou compte sans rôle)", () => {
    expect(can(null, "services.manage")).toBe(false);
    expect(can(undefined, "contacts.view")).toBe(false);
  });

  it("editor gère les contenus mais pas le commercial ni les paramètres", () => {
    const editor = accessFor("editor");
    expect(can(editor, "services.manage")).toBe(true);
    expect(can(editor, "team.manage")).toBe(true);
    expect(can(editor, "quotes.view")).toBe(false);
    expect(can(editor, "settings.manage")).toBe(false);
  });

  it("commercial traite devis et messages, sans éditer de contenu", () => {
    const commercial = accessFor("commercial");
    expect(can(commercial, "quotes.manage")).toBe(true);
    expect(can(commercial, "contacts.manage")).toBe(true);
    expect(can(commercial, "articles.manage")).toBe(false);
  });

  it("l'écriture Storage suit la permission du bucket", () => {
    expect(canWriteBucket(accessFor("editor"), "services")).toBe(true);
    expect(canWriteBucket(accessFor("editor"), "site-assets")).toBe(false);
    expect(canWriteBucket(accessFor("communication_manager"), "site-assets")).toBe(true);
    expect(canWriteBucket(accessFor("communication_manager"), "services")).toBe(false);
    expect(canWriteBucket(accessFor("commercial"), "projects")).toBe(false);
  });

  it("seul un super_admin peut attribuer le rôle super_admin", () => {
    expect(assignableRoles(accessFor("super_admin"))).toContain("super_admin");
    expect(assignableRoles(accessFor("editor"))).toEqual([]);
  });
});

describe("menu selon le rôle", () => {
  it("editor : contenus visibles, pas de devis / messages / utilisateurs", () => {
    const labels = labelsFor("editor");
    expect(labels).toContain("Services");
    expect(labels).toContain("Médiathèque");
    expect(labels).not.toContain("Demandes de devis");
    expect(labels).not.toContain("Messages");
    expect(labels).not.toContain("Utilisateurs");
  });

  it("commercial : devis et messages visibles", () => {
    const labels = labelsFor("commercial");
    expect(labels).toContain("Demandes de devis");
    expect(labels).toContain("Messages");
    expect(labels).not.toContain("Utilisateurs");
  });

  it("communication_manager : messages mais pas devis", () => {
    const labels = labelsFor("communication_manager");
    expect(labels).toContain("Messages");
    expect(labels).not.toContain("Demandes de devis");
  });

  it("super_admin : tout, y compris Utilisateurs", () => {
    expect(labelsFor("super_admin")).toContain("Utilisateurs");
  });
});
