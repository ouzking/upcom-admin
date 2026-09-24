import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signInAs } from "@/test/fakes";
import { renderPage } from "@/test/render";
import AccountPage from "./account/AccountPage";
import DashboardPage from "./dashboard/DashboardPage";
import MediaLibraryPage from "./media/MediaLibraryPage";
import SettingsPage from "./settings/SettingsPage";
import UsersPage from "./users/UsersPage";

vi.mock("@/repositories/auth.repository", async () => (await import("@/test/fakes")).authModule);
vi.mock("@/repositories/dashboard.repository", () => ({
  dashboardRepository: {
    contentStat: vi.fn(async () => ({ published: 4, total: 6 })),
    countQuotes: vi.fn(async (status?: string) => (status ? 2 : 9)),
    countMessages: vi.fn(async (status?: string) => (status ? 1 : 5)),
    recentQuotes: vi.fn(async () => [{ id: "q-1", name: "Moussa Fall", company: null, status: "new", createdAt: "2026-09-24T08:00:00Z", service: "Identité visuelle" }]),
    recentMessages: vi.fn(async () => [{ id: "m-1", name: "Fatou Sow", subject: "Information", status: "new", createdAt: "2026-09-24T07:00:00Z" }]),
    recentContent: vi.fn(async () => [{ table: "articles", id: "a-1", title: "Lancement du site", status: "draft", updatedAt: "2026-09-23T10:00:00Z" }]),
    scheduledArticles: vi.fn(async () => []),
    draftCounts: vi.fn(async () => ({ articles: 1 })),
  },
}));
vi.mock("@/repositories/media.repository", () => ({
  mediaRepository: {
    list: vi.fn(async () => [
      { kind: "folder", name: "svc-1", path: "services/svc-1" },
      { kind: "file", name: "affiche.webp", path: "affiche.webp", size: 2048, mimeType: "image/webp", createdAt: "2026-09-01T00:00:00Z", updatedAt: null },
    ]),
    upload: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock("@/repositories/settings.repository", () => ({
  settingsRepository: {
    get: vi.fn(async () => ({
      id: 1,
      company_name: "UPCOM AGENCY & SERVICES",
      tagline: null,
      description: null,
      address: "Ouest Foire, Cité Air Afrique, Lot 13",
      phone_primary: "77 402 74 94",
      phone_secondary: "77 835 92 94",
      email: null,
      whatsapp_number: null,
      map_url: null,
      opening_hours: null,
      logo_path: null,
      favicon_path: null,
      created_at: "2026-09-24T00:00:00Z",
      updated_at: "2026-09-24T00:00:00Z",
    })),
    update: vi.fn(),
  },
  socialLinksRepository: { list: vi.fn(async () => []), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));
vi.mock("@/repositories/users.repository", () => ({
  usersRepository: {
    list: vi.fn(async () => [
      { id: "user-1", email: "awa@upcom.test", full_name: "Awa Diop", role: "super_admin", is_active: true, created_at: "2026-09-01T00:00:00Z", updated_at: "2026-09-01T00:00:00Z" },
      { id: "user-2", email: "nouveau@upcom.test", full_name: null, role: null, is_active: true, created_at: "2026-09-02T00:00:00Z", updated_at: "2026-09-02T00:00:00Z" },
    ]),
    listStaff: vi.fn(async () => []),
    updateRole: vi.fn(),
    setActive: vi.fn(),
    invite: vi.fn(),
  },
}));

describe("Écrans principaux (rendu)", () => {
  beforeEach(() => signInAs("super_admin"));

  it("tableau de bord : salutation, indicateurs, demandes, activité", async () => {
    renderPage("/", <DashboardPage />);
    expect(await screen.findByRole("heading", { name: /(Bonjour|Bonsoir), Awa/ })).toBeInTheDocument();
    expect(await screen.findByText("Services publiés")).toBeInTheDocument();
    expect(screen.getByText("Demandes de devis")).toBeInTheDocument();
    expect(await screen.findAllByText("Moussa Fall")).not.toHaveLength(0);
    expect(await screen.findByText("1 brouillon · Actualités")).toBeInTheDocument();
  });

  it("médiathèque : dossiers et fichiers", async () => {
    renderPage("/medias", <MediaLibraryPage />);
    expect(await screen.findByText("affiche.webp")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "svc-1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Téléverser" })).toBeInTheDocument();
  });

  it("paramètres : informations officielles, e-mail laissé vide", async () => {
    renderPage("/parametres", <SettingsPage />);
    expect(await screen.findByDisplayValue("Ouest Foire, Cité Air Afrique, Lot 13")).toBeInTheDocument();
    expect(screen.getByDisplayValue("77 402 74 94")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "E-mail de contact" })).toHaveValue("");
  });

  it("utilisateurs : liste, statut en attente, invitation", async () => {
    renderPage("/utilisateurs", <UsersPage />);
    expect(await screen.findByText("nouveau@upcom.test")).toBeInTheDocument();
    expect(screen.getByText("En attente de rôle")).toBeInTheDocument();
    expect(screen.getByText("Vous")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inviter un membre" })).toBeInTheDocument();
  });

  it("mon compte : profil et permissions", async () => {
    renderPage("/compte", <AccountPage />);
    expect(await screen.findByDisplayValue("awa@upcom.test")).toBeInTheDocument();
    expect(screen.getByText("Gérer les utilisateurs")).toBeInTheDocument();
  });
});
