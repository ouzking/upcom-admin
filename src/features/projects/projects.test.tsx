import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signInAs } from "@/test/fakes";
import { renderRoutes } from "@/test/render";
import type { ProjectImageRow, ProjectRow } from "@/types";
import ProjectEditPage from "./ProjectEditPage";

const mocks = vi.hoisted(() => ({
  repo: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), setStatus: vi.fn(), remove: vi.fn() },
  listProjectImages: vi.fn(),
  syncProjectGallery: vi.fn(),
  upload: vi.fn(),
}));

vi.mock("@/repositories/auth.repository", async () => (await import("@/test/fakes")).authModule);
vi.mock("@/repositories/projects.repository", () => ({
  projectsRepository: mocks.repo,
  listProjectImages: mocks.listProjectImages,
  syncProjectGallery: mocks.syncProjectGallery,
}));
vi.mock("@/repositories/services.repository", () => ({
  listServiceCategories: vi.fn(async () => [{ id: "cat-4", name: "Production audiovisuelle", slug: "production-audiovisuelle", display_order: 40, status: "published" }]),
}));
vi.mock("@/repositories/media.repository", () => ({ mediaRepository: { upload: mocks.upload, list: vi.fn(async () => []), remove: vi.fn() } }));

const project = (overrides: Partial<ProjectRow> = {}): ProjectRow => ({
  id: "p-1",
  category_id: null,
  title: "Film institutionnel",
  slug: "film-institutionnel",
  excerpt: null,
  description: null,
  client_name: null,
  year: 2026,
  cover_image_path: null,
  display_order: 0,
  is_featured: false,
  status: "draft",
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
  ...overrides,
});

const image = (id: string, path: string, order: number): ProjectImageRow => ({
  id,
  project_id: "p-1",
  image_path: path,
  alt_text: null,
  caption: null,
  display_order: order,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
});

const routes = [
  { path: "/realisations/nouveau", element: <ProjectEditPage /> },
  { path: "/realisations/:id", element: <ProjectEditPage /> },
];

describe("Réalisations", () => {
  beforeEach(() => signInAs("editor"));

  it("crée une réalisation avec sa galerie (upload multiple)", async () => {
    mocks.upload.mockImplementation(async (_bucket: string, folder: string, file: File) => `${folder}/${file.name}`);
    mocks.repo.create.mockImplementation(async (input: Partial<ProjectRow>) => project({ ...input, id: input.id }));
    mocks.syncProjectGallery.mockImplementation(async (projectId: string) => [image("img-1", `projects/${projectId}/galerie/a.webp`, 0)]);
    const { user } = renderRoutes(routes, "/realisations/nouveau");

    await user.type(await screen.findByRole("textbox", { name: "Titre" }), "Film institutionnel");
    await user.type(screen.getByRole("textbox", { name: "Client" }), "Client officiel");
    await user.selectOptions(screen.getByRole("combobox", { name: "Catégorie" }), "cat-4");
    await user.upload(screen.getByTestId("gallery-file-input"), [
      new File(["a"], "a.webp", { type: "image/webp" }),
      new File(["b"], "b.webp", { type: "image/webp" }),
    ]);
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Retirer de la galerie" })).toHaveLength(2));

    await user.click(screen.getByRole("button", { name: "Enregistrer le brouillon" }));

    await waitFor(() => expect(mocks.repo.create).toHaveBeenCalledTimes(1));
    const payload = mocks.repo.create.mock.calls[0]![0] as ProjectRow;
    expect(payload).toMatchObject({ title: "Film institutionnel", client_name: "Client officiel", category_id: "cat-4", year: new Date().getFullYear(), status: "draft" });
    // Les images sont rangées dans le dossier de la réalisation, puis liées après sa création.
    expect(mocks.upload).toHaveBeenCalledWith("projects", `projects/${payload.id}/galerie`, expect.any(File));
    await waitFor(() =>
      expect(mocks.syncProjectGallery).toHaveBeenCalledWith(payload.id, [
        { image_path: `projects/${payload.id}/galerie/a.webp`, alt_text: null, caption: null },
        { image_path: `projects/${payload.id}/galerie/b.webp`, alt_text: null, caption: null },
      ]),
    );
    expect(await screen.findByText("Réalisation créée avec succès.")).toBeInTheDocument();
  });

  it("charge la galerie existante et publie", async () => {
    mocks.repo.get.mockResolvedValue(project());
    mocks.listProjectImages.mockResolvedValue([image("img-1", "projects/p-1/a.webp", 0)]);
    mocks.repo.update.mockImplementation(async (id: string, input: Partial<ProjectRow>) => project({ id, ...input }));
    mocks.syncProjectGallery.mockResolvedValue([image("img-1", "projects/p-1/a.webp", 0)]);
    const { user } = renderRoutes(routes, "/realisations/p-1");

    await user.type(await screen.findByRole("textbox", { name: "Texte alternatif de l'image 1" }), "Tournage");
    await user.click(screen.getByRole("button", { name: "Publier" }));

    await waitFor(() => expect(mocks.repo.update).toHaveBeenCalledWith("p-1", expect.objectContaining({ status: "published" })));
    expect(mocks.syncProjectGallery).toHaveBeenCalledWith("p-1", [{ id: "img-1", image_path: "projects/p-1/a.webp", alt_text: "Tournage", caption: null }]);
    expect(await screen.findByText("Publication effectuée.")).toBeInTheDocument();
  });

  it("refuse une année hors limites (contrainte year du schéma)", async () => {
    const { user } = renderRoutes(routes, "/realisations/nouveau");
    await user.type(await screen.findByRole("textbox", { name: "Titre" }), "Projet");
    const year = screen.getByRole("textbox", { name: "Année" });
    await user.clear(year);
    await user.type(year, "1850");
    await user.click(screen.getByRole("button", { name: "Enregistrer le brouillon" }));
    expect(await screen.findByText("Année entre 1990 et 2100.")).toBeInTheDocument();
    expect(mocks.repo.create).not.toHaveBeenCalled();
  });
});
