import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signInAs } from "@/test/fakes";
import { renderRoutes, LocationProbe } from "@/test/render";
import type { ServiceRow } from "@/types";
import ServiceEditPage from "./ServiceEditPage";
import ServicesListPage from "./ServicesListPage";

const repo = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  setStatus: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/repositories/auth.repository", async () => (await import("@/test/fakes")).authModule);
vi.mock("@/repositories/services.repository", () => ({
  servicesRepository: repo,
  listServiceCategories: vi.fn(async () => [
    { id: "cat-1", name: "Communication digitale", slug: "communication-digitale", display_order: 20, status: "published" },
    { id: "cat-2", name: "Événementiel", slug: "evenementiel", display_order: 50, status: "published" },
  ]),
}));

const service = (overrides: Partial<ServiceRow> = {}): ServiceRow => ({
  id: "svc-1",
  category_id: "cat-1",
  title: "Gestion des réseaux sociaux",
  slug: "gestion-des-reseaux-sociaux",
  short_description: "Animation de communautés.",
  description: "## Notre approche",
  image_path: null,
  icon: "megaphone",
  display_order: 10,
  is_featured: false,
  status: "draft",
  created_at: "2026-09-01T10:00:00Z",
  updated_at: "2026-09-10T10:00:00Z",
  ...overrides,
});

const withProbe = (element: React.ReactNode) => (
  <>
    {element}
    <LocationProbe />
  </>
);

const routes = [
  { path: "/services", element: withProbe(<ServicesListPage />) },
  { path: "/services/nouveau", element: withProbe(<ServiceEditPage />) },
  { path: "/services/:id", element: withProbe(<ServiceEditPage />) },
];

describe("Services", () => {
  beforeEach(() => {
    signInAs("editor");
    repo.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
  });

  it("crée un service en brouillon avec les bonnes données", async () => {
    repo.create.mockImplementation(async (input: Partial<ServiceRow>) => service({ ...input, id: input.id, updated_at: "2026-09-24T10:00:00Z" }));
    const { user } = renderRoutes(routes, "/services/nouveau");

    await user.type(await screen.findByRole("textbox", { name: "Titre" }), "Stratégie digitale");
    await user.selectOptions(screen.getByRole("combobox", { name: "Catégorie" }), "cat-1");
    await user.type(screen.getByLabelText("Description courte"), "Plan de communication en ligne.");
    await user.click(screen.getByRole("button", { name: "Enregistrer le brouillon" }));

    await waitFor(() => expect(repo.create).toHaveBeenCalledTimes(1));
    const payload = repo.create.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      title: "Stratégie digitale",
      slug: "strategie-digitale",
      category_id: "cat-1",
      short_description: "Plan de communication en ligne.",
      description: null,
      status: "draft",
      is_featured: false,
      display_order: 0,
    });
    expect(payload.id).toEqual(expect.any(String));
    expect(await screen.findByText("Service créé avec succès.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(`/services/${String(payload.id)}`));
  });

  it("valide le formulaire avant l'envoi", async () => {
    const { user } = renderRoutes(routes, "/services/nouveau");
    await user.click(await screen.findByRole("button", { name: "Publier" }));
    expect(await screen.findByText("Le titre est requis.")).toBeInTheDocument();
    expect(screen.getByText("Choisissez une catégorie.")).toBeInTheDocument();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("modifie puis publie un service existant", async () => {
    repo.get.mockResolvedValue(service());
    repo.update.mockImplementation(async (id: string, input: Partial<ServiceRow>) => service({ id, ...input }));
    const { user } = renderRoutes(routes, "/services/svc-1");

    const title = await screen.findByRole("textbox", { name: "Titre" });
    expect(title).toHaveValue("Gestion des réseaux sociaux");
    await user.clear(title);
    await user.type(title, "Community management");
    await user.click(screen.getByRole("button", { name: "Publier" }));

    await waitFor(() =>
      expect(repo.update).toHaveBeenCalledWith("svc-1", expect.objectContaining({ title: "Community management", status: "published", slug: "gestion-des-reseaux-sociaux" })),
    );
    expect(await screen.findByText("Publication effectuée.")).toBeInTheDocument();
  });

  it("enregistre une modification sans changer le statut", async () => {
    repo.get.mockResolvedValue(service({ status: "published" }));
    repo.update.mockImplementation(async (id: string, input: Partial<ServiceRow>) => service({ id, ...input }));
    const { user } = renderRoutes(routes, "/services/svc-1");

    await user.type(await screen.findByLabelText("Description courte"), " Et plus.");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(repo.update).toHaveBeenCalledWith("svc-1", expect.objectContaining({ status: "published" })));
    expect(await screen.findByText("Modification enregistrée.")).toBeInTheDocument();
  });

  it("publie un brouillon depuis la liste", async () => {
    repo.list.mockResolvedValue({ items: [{ ...service(), category: { id: "cat-1", name: "Communication digitale" } }], total: 1, page: 1, pageSize: 20 });
    repo.setStatus.mockResolvedValue(undefined);
    const { user } = renderRoutes(routes, "/services");

    await user.click(await screen.findByRole("button", { name: /Actions pour Gestion des réseaux sociaux/ }));
    await user.click(screen.getByRole("menuitem", { name: "Publier" }));

    await waitFor(() => expect(repo.setStatus).toHaveBeenCalledWith("svc-1", "published"));
    expect(await screen.findByText("Publication effectuée.")).toBeInTheDocument();
  });

  it("archive un service après confirmation", async () => {
    repo.list.mockResolvedValue({ items: [{ ...service({ status: "published" }), category: null }], total: 1, page: 1, pageSize: 20 });
    repo.setStatus.mockResolvedValue(undefined);
    const { user } = renderRoutes(routes, "/services");

    await user.click(await screen.findByRole("button", { name: /Actions pour/ }));
    await user.click(screen.getByRole("menuitem", { name: "Archiver" }));
    const dialog = await screen.findByRole("dialog");
    expect(repo.setStatus).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Archiver" }));

    await waitFor(() => expect(repo.setStatus).toHaveBeenCalledWith("svc-1", "archived"));
    expect(await screen.findByText("Contenu archivé.")).toBeInTheDocument();
  });

  it("filtre la liste par recherche et statut (paramètres transmis au repository)", async () => {
    const { user } = renderRoutes(routes, "/services");
    await user.click(await screen.findByRole("tab", { name: "Publiés" }));
    await waitFor(() => expect(repo.list).toHaveBeenLastCalledWith(expect.objectContaining({ filters: expect.objectContaining({ status: "published" }) })));
    await user.type(screen.getByRole("searchbox", { name: "Rechercher un service" }), "logo");
    await waitFor(() => expect(repo.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: "logo", page: 1 })), { timeout: 2000 });
  });

  it("lecture seule pour un rôle sans services.manage", async () => {
    signInAs("commercial");
    repo.list.mockResolvedValue({ items: [{ ...service(), category: null }], total: 1, page: 1, pageSize: 20 });
    renderRoutes(routes, "/services");
    expect(await screen.findByText(/Consultation seule/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Nouveau service" })).not.toBeInTheDocument();
  });
});
