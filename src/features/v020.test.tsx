import { act, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { visibleNavigation } from "@/config/navigation";
import { AdminLayout } from "@/layouts/AdminLayout";
import { assignableRoles, can } from "@/lib/permissions";
import type { LeadChange } from "@/repositories/realtime.repository";
import { accessFor, signInAs } from "@/test/fakes";
import { renderPage, renderRoutes } from "@/test/render";
import MediaLibraryPage from "./media/MediaLibraryPage";
import QuoteDetailPage from "./quotes/QuoteDetailPage";
import UsersPage from "./users/UsersPage";

const mocks = vi.hoisted(() => ({
  realtime: { onChange: null as null | ((change: LeadChange) => void), onStatus: null as null | ((live: boolean) => void), tables: [] as string[] },
  dashboard: {
    recentQuotes: vi.fn(async () => []),
    countQuotes: vi.fn(async () => 0),
    recentMessages: vi.fn(async () => []),
    countMessages: vi.fn(async () => 0),
    scheduledArticles: vi.fn(async () => []),
    draftCounts: vi.fn(async () => ({})),
  },
  site: { triggerRebuild: vi.fn(), cleanupMedia: vi.fn() },
  users: { list: vi.fn(), listStaff: vi.fn(async () => []), updateRole: vi.fn(), setActive: vi.fn(), invite: vi.fn(), remove: vi.fn() },
  quotes: { get: vi.fn(), update: vi.fn(), remove: vi.fn(), resendNotification: vi.fn(), list: vi.fn(), countByStatus: vi.fn() },
}));

vi.mock("@/repositories/auth.repository", async () => (await import("@/test/fakes")).authModule);
vi.mock("@/repositories/realtime.repository", () => ({
  subscribeToLeads: (tables: string[], onChange: (change: LeadChange) => void, onStatus: (live: boolean) => void) => {
    mocks.realtime.tables = tables;
    mocks.realtime.onChange = onChange;
    mocks.realtime.onStatus = onStatus;
    return () => undefined;
  },
}));
vi.mock("@/repositories/dashboard.repository", () => ({ dashboardRepository: mocks.dashboard }));
vi.mock("@/repositories/site.repository", () => ({ siteRepository: mocks.site }));
vi.mock("@/repositories/users.repository", () => ({ usersRepository: mocks.users }));
vi.mock("@/repositories/quotes.repository", () => ({ quotesRepository: mocks.quotes }));
vi.mock("@/repositories/media.repository", () => ({ mediaRepository: { list: vi.fn(async () => []), upload: vi.fn(), remove: vi.fn() } }));

const layoutRoutes = [{ path: "/", element: <AdminLayout />, children: [{ index: true, element: <h1>Tableau de bord</h1> }] }];

describe("v0.2.0 — rôle observateur", () => {
  it("lecture seule : consulte devis et messages, ne modifie rien", () => {
    const viewer = accessFor("viewer");
    expect(can(viewer, "quotes.view")).toBe(true);
    expect(can(viewer, "contacts.view")).toBe(true);
    for (const permission of ["quotes.manage", "contacts.manage", "services.manage", "settings.manage", "users.manage"] as const) {
      expect(can(viewer, permission)).toBe(false);
    }
    const labels = visibleNavigation((permission) => can(viewer, permission)).flatMap((section) => section.items.map((item) => item.label));
    expect(labels).toEqual(expect.arrayContaining(["Services", "Demandes de devis", "Messages", "Médiathèque"]));
    expect(labels).not.toContain("Utilisateurs");
  });

  it("peut être attribué par un super_admin", () => {
    expect(assignableRoles(accessFor("super_admin"))).toContain("viewer");
  });

  it("fiche devis : ni suivi ni renvoi de notification", async () => {
    signInAs("viewer");
    mocks.quotes.get.mockResolvedValue({
      id: "q-1", name: "Moussa Fall", company: null, email: "moussa@example.com", phone: "77 000 00 00", service_id: null, budget: null, deadline: null,
      message: "Demande de test pour l'observateur.", status: "new", assigned_to: null, internal_notes: null, notified_at: null,
      created_at: "2026-10-01T08:00:00Z", updated_at: "2026-10-01T08:00:00Z", service: null, assignee: null,
    });
    renderRoutes([{ path: "/devis/:id", element: <QuoteDetailPage /> }], "/devis/q-1");
    expect(await screen.findByRole("heading", { name: "Moussa Fall" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Renvoyer la notification/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enregistrer le suivi" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute("href", expect.stringContaining("https://wa.me/221770000000"));
  });
});

describe("v0.2.0 — temps réel", () => {
  beforeEach(() => signInAs("commercial"));

  it("s'abonne aux tables autorisées, affiche « En direct » et rafraîchit à chaque nouvelle demande", async () => {
    const { user } = renderRoutes(layoutRoutes, "/");
    await screen.findByRole("heading", { name: "Tableau de bord" });
    await waitFor(() => expect(mocks.realtime.tables).toEqual(["quote_requests", "contact_messages"]));

    act(() => mocks.realtime.onStatus?.(true));
    await user.click(screen.getByRole("button", { name: /Notifications/ }));
    expect(await screen.findByText("En direct")).toBeInTheDocument();

    const callsBefore = mocks.dashboard.recentQuotes.mock.calls.length;
    mocks.dashboard.recentQuotes.mockResolvedValue([{ id: "q-9", name: "Awa Ndiaye", company: "Entreprise", status: "new", createdAt: new Date().toISOString(), service: null }] as never);
    mocks.dashboard.countQuotes.mockResolvedValue(1);
    act(() => mocks.realtime.onChange?.({ table: "quote_requests", event: "INSERT", record: { id: "q-9", name: "Awa Ndiaye" } }));

    await waitFor(() => expect(mocks.dashboard.recentQuotes.mock.calls.length).toBeGreaterThan(callsBefore));
    expect(await screen.findByText(/Nouvelle demande de devis · Awa Ndiaye/)).toBeInTheDocument();
  });

  it("éditeur : aucun abonnement (pas d'accès aux demandes)", async () => {
    signInAs("editor");
    renderRoutes(layoutRoutes, "/");
    await screen.findByRole("heading", { name: "Tableau de bord" });
    await waitFor(() => expect(mocks.realtime.tables).toEqual([]));
  });
});

describe("v0.2.0 — mise à jour du site", () => {
  it("lance la régénération et informe l'utilisateur", async () => {
    signInAs("editor");
    mocks.site.triggerRebuild.mockResolvedValue({ status: "triggered" });
    const { user } = renderRoutes(layoutRoutes, "/");
    await user.click(await screen.findByRole("button", { name: "Mettre à jour le site" }));
    await waitFor(() => expect(mocks.site.triggerRebuild).toHaveBeenCalled());
    expect(await screen.findByText("Mise à jour du site lancée.")).toBeInTheDocument();
  });

  it("absent pour un observateur", async () => {
    signInAs("viewer");
    renderRoutes(layoutRoutes, "/");
    await screen.findByRole("heading", { name: "Tableau de bord" });
    expect(screen.queryByRole("button", { name: "Mettre à jour le site" })).not.toBeInTheDocument();
  });
});

describe("v0.2.0 — suppression de compte", () => {
  beforeEach(() => {
    signInAs("super_admin");
    mocks.users.list.mockResolvedValue([
      { id: "user-1", email: "awa@upcom.test", full_name: "Awa Diop", role: "super_admin", is_active: true, created_at: "2026-09-01T00:00:00Z", updated_at: "2026-09-01T00:00:00Z" },
      { id: "user-2", email: "ancien@upcom.test", full_name: "Ancien Membre", role: "editor", is_active: false, created_at: "2026-09-02T00:00:00Z", updated_at: "2026-09-02T00:00:00Z" },
    ]);
  });

  it("supprime après confirmation ; jamais son propre compte", async () => {
    mocks.users.remove.mockResolvedValue({ user_id: "user-2" });
    const { user } = renderPage("/utilisateurs", <UsersPage />);
    await screen.findByText("ancien@upcom.test");
    expect(screen.queryByRole("button", { name: /Supprimer définitivement le compte de Awa Diop/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Supprimer définitivement le compte de Ancien Membre/ }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Supprimer le compte" }));
    await waitFor(() => expect(mocks.users.remove).toHaveBeenCalledWith("user-2"));
    expect(await screen.findByText("Compte supprimé définitivement.")).toBeInTheDocument();
  });

  it("affiche le refus du serveur (dernier super_admin)", async () => {
    const { AppError } = await import("@/lib/errors");
    mocks.users.remove.mockRejectedValue(new AppError("Impossible de supprimer le dernier super_admin actif.", { code: "conflict" }));
    const { user } = renderPage("/utilisateurs", <UsersPage />);
    await user.click(await screen.findByRole("button", { name: /Supprimer définitivement le compte de Ancien Membre/ }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Supprimer le compte" }));
    expect(await screen.findByText("Impossible de supprimer le dernier super_admin actif.")).toBeInTheDocument();
  });
});

describe("v0.2.0 — nettoyage des médias", () => {
  it("aperçu puis suppression confirmée", async () => {
    signInAs("super_admin");
    mocks.site.cleanupMedia.mockImplementation(async (dryRun: boolean) =>
      dryRun
        ? { dry_run: true, files: [{ bucket: "services", path: "services/x/1-old.webp", size_bytes: 204800, created_at: "2026-09-20T00:00:00Z" }], total_bytes: 204800, deleted: 0 }
        : { dry_run: false, files: [], total_bytes: 204800, deleted: 1 },
    );
    const { user } = renderPage("/medias", <MediaLibraryPage />);
    await user.click(await screen.findByRole("button", { name: "Nettoyer les médias inutilisés" }));
    expect(mocks.site.cleanupMedia).toHaveBeenCalledWith(true);
    await user.click(await screen.findByRole("button", { name: /Supprimer 1 fichier/ }));
    const dialogs = await screen.findAllByRole("dialog");
    await user.click(within(dialogs[dialogs.length - 1]!).getByRole("button", { name: "Supprimer" }));
    await waitFor(() => expect(mocks.site.cleanupMedia).toHaveBeenCalledWith(false));
    expect(await screen.findByText("1 fichier supprimé.")).toBeInTheDocument();
  });

  it("réservé à settings.manage", async () => {
    signInAs("editor");
    renderPage("/medias", <MediaLibraryPage />);
    await screen.findByRole("heading", { name: "Médiathèque" });
    expect(screen.queryByRole("button", { name: "Nettoyer les médias inutilisés" })).not.toBeInTheDocument();
  });
});
