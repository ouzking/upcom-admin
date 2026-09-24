import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QuoteListItem } from "@/repositories/quotes.repository";
import { signInAs } from "@/test/fakes";
import { renderRoutes } from "@/test/render";
import QuoteDetailPage from "./QuoteDetailPage";
import QuotesListPage from "./QuotesListPage";

const mocks = vi.hoisted(() => ({
  quotes: { list: vi.fn(), get: vi.fn(), countByStatus: vi.fn(), update: vi.fn(), remove: vi.fn(), resendNotification: vi.fn() },
  staff: vi.fn(),
}));

vi.mock("@/repositories/auth.repository", async () => (await import("@/test/fakes")).authModule);
vi.mock("@/repositories/quotes.repository", () => ({ quotesRepository: mocks.quotes }));
vi.mock("@/repositories/users.repository", () => ({ usersRepository: { listStaff: mocks.staff } }));

const quote = (overrides: Partial<QuoteListItem> = {}): QuoteListItem => ({
  id: "q-1",
  name: "Moussa Fall",
  company: "Entreprise Démo",
  email: "moussa@example.com",
  phone: "77 000 00 00",
  service_id: "svc-1",
  budget: "1 000 000 – 2 500 000 FCFA",
  deadline: "2026-12-01",
  message: "Nous souhaitons refondre notre identité visuelle.",
  status: "new",
  assigned_to: null,
  internal_notes: null,
  notified_at: null,
  created_at: "2026-09-24T08:00:00Z",
  updated_at: "2026-09-24T08:00:00Z",
  service: { id: "svc-1", title: "Identité visuelle" },
  assignee: null,
  ...overrides,
});

const routes = [
  { path: "/devis", element: <QuotesListPage /> },
  { path: "/devis/:id", element: <QuoteDetailPage /> },
];

describe("Demandes de devis", () => {
  beforeEach(() => {
    signInAs("commercial");
    mocks.staff.mockResolvedValue([{ id: "user-2", full_name: "Commercial UPCOM", email: "commercial@upcom.test", role: "commercial" }]);
    mocks.quotes.update.mockResolvedValue(undefined);
  });

  it("liste les demandes avec compteurs par statut et filtre", async () => {
    mocks.quotes.list.mockResolvedValue({ items: [quote()], total: 1, page: 1, pageSize: 20 });
    mocks.quotes.countByStatus.mockResolvedValue({ new: 1, in_progress: 2, contacted: 0, converted: 3, closed: 0 });
    const { user } = renderRoutes(routes, "/devis");

    expect(await screen.findByText("Moussa Fall")).toBeInTheDocument();
    expect(screen.getByText("Identité visuelle")).toBeInTheDocument();
    const tile = screen.getByRole("button", { name: /Convertie\s*3/ });
    await user.click(tile);
    await waitFor(() => expect(mocks.quotes.list).toHaveBeenLastCalledWith(expect.objectContaining({ filters: expect.objectContaining({ status: "converted" }) })));
  });

  it("affiche la fiche et fait avancer le statut", async () => {
    mocks.quotes.get.mockResolvedValue(quote());
    const { user } = renderRoutes(routes, "/devis/q-1");

    expect(await screen.findByRole("heading", { name: "Moussa Fall" })).toBeInTheDocument();
    expect(screen.getByText("Nous souhaitons refondre notre identité visuelle.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Répondre par e-mail/ })).toHaveAttribute("href", expect.stringContaining("mailto:moussa@example.com"));

    const steps = screen.getByRole("list", { name: "Statut de la demande" });
    await user.click(within(steps).getByRole("button", { name: /Contacté/ }));
    await waitFor(() => expect(mocks.quotes.update).toHaveBeenCalledWith("q-1", { status: "contacted" }));
    expect(await screen.findByText("Modification enregistrée.")).toBeInTheDocument();
  });

  it("enregistre l'assignation et les notes internes (colonnes de suivi uniquement)", async () => {
    mocks.quotes.get.mockResolvedValue(quote());
    const { user } = renderRoutes(routes, "/devis/q-1");

    await screen.findByRole("option", { name: "Commercial UPCOM" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Responsable du suivi" }), "user-2");
    await user.type(screen.getByRole("textbox", { name: "Notes internes" }), "Rappeler lundi.");
    await user.click(screen.getByRole("button", { name: "Enregistrer le suivi" }));

    await waitFor(() => expect(mocks.quotes.update).toHaveBeenCalledWith("q-1", { assigned_to: "user-2", internal_notes: "Rappeler lundi." }));
  });

  it("lecture seule sans quotes.manage", async () => {
    signInAs("super_admin");
    const { authState } = await import("@/test/fakes");
    authState.access = { role: "editor", permissions: ["quotes.view"] };
    mocks.quotes.get.mockResolvedValue(quote());
    renderRoutes(routes, "/devis/q-1");

    await screen.findByRole("heading", { name: "Moussa Fall" });
    expect(screen.queryByRole("button", { name: "Enregistrer le suivi" })).not.toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Statut de la demande" })).getByRole("button", { name: /Contacté/ })).toBeDisabled();
  });
});
