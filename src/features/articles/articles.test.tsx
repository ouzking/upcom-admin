import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signInAs } from "@/test/fakes";
import { renderRoutes } from "@/test/render";
import type { ArticleRow } from "@/types";
import { articleSchema, articleToInput, emptyArticle, isScheduled } from "./article-form";
import ArticleEditPage from "./ArticleEditPage";

const repo = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), setStatus: vi.fn(), remove: vi.fn() }));

vi.mock("@/repositories/auth.repository", async () => (await import("@/test/fakes")).authModule);
vi.mock("@/repositories/articles.repository", () => ({
  articlesRepository: repo,
  articleCategoriesRepository: {
    list: vi.fn(async () => [{ id: "ac-1", name: "Vie de l'agence", slug: "vie-de-l-agence", display_order: 0 }]),
    create: vi.fn(),
    rename: vi.fn(),
    remove: vi.fn(),
  },
}));

const article = (overrides: Partial<ArticleRow> = {}): ArticleRow => ({
  id: "a-1",
  category_id: null,
  author_id: "user-1",
  author_name: "Équipe UPCOM",
  title: "Lancement du nouveau site",
  slug: "lancement-du-nouveau-site",
  excerpt: null,
  content: null,
  cover_image_path: null,
  is_featured: false,
  status: "draft",
  published_at: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
  ...overrides,
});

const routes = [
  { path: "/actualites/nouveau", element: <ArticleEditPage /> },
  { path: "/actualites/:id", element: <ArticleEditPage /> },
];

describe("Articles — règles", () => {
  it("exige un titre de 2 caractères minimum", () => {
    expect(articleSchema.safeParse({ ...emptyArticle, title: "A" }).success).toBe(false);
    expect(articleSchema.safeParse({ ...emptyArticle, title: "Actualité" }).success).toBe(true);
  });

  it("date vide → NULL (renseignée par la base à la publication)", () => {
    expect(articleToInput({ ...emptyArticle, title: "Actualité" }).published_at).toBeNull();
  });

  it("détecte une publication programmée", () => {
    const now = new Date("2026-09-24T12:00:00Z");
    expect(isScheduled({ status: "published", published_at: "2026-10-01T08:00:00Z" }, now)).toBe(true);
    expect(isScheduled({ status: "published", published_at: "2026-09-01T08:00:00Z" }, now)).toBe(false);
    expect(isScheduled({ status: "draft", published_at: "2026-10-01T08:00:00Z" }, now)).toBe(false);
  });
});

describe("Articles — édition", () => {
  beforeEach(() => signInAs("communication_manager"));

  it("rédige avec l'éditeur (barre d'outils Markdown) et crée l'article", async () => {
    repo.create.mockImplementation(async (input: Partial<ArticleRow>) => article({ ...input, id: input.id }));
    const { user } = renderRoutes(routes, "/actualites/nouveau");

    await user.type(await screen.findByRole("textbox", { name: "Titre" }), "Lancement du nouveau site");
    const editor = screen.getByPlaceholderText("Rédigez votre article…");
    await user.type(editor, "Introduction");
    await user.click(screen.getByRole("button", { name: "Titre de section" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Catégorie" }), "ac-1");
    await user.click(screen.getByRole("button", { name: "Enregistrer le brouillon" }));

    await waitFor(() => expect(repo.create).toHaveBeenCalledTimes(1));
    expect(repo.create.mock.calls[0]![0]).toMatchObject({
      title: "Lancement du nouveau site",
      content: "## Introduction",
      category_id: "ac-1",
      author_name: "Équipe UPCOM",
      status: "draft",
      published_at: null,
    });
    expect(await screen.findByText("Article créé avec succès.")).toBeInTheDocument();
  });

  it("programme une publication à une date future", async () => {
    repo.get.mockResolvedValue(article());
    repo.update.mockImplementation(async (id: string, input: Partial<ArticleRow>) => article({ id, ...input }));
    const { user } = renderRoutes(routes, "/actualites/a-1");

    const date = await screen.findByLabelText("Date de publication");
    await user.type(date, "2030-01-15T09:00");
    expect(screen.getByText(/Date future/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Publier" }));

    await waitFor(() => expect(repo.update).toHaveBeenCalledTimes(1));
    const [, payload] = repo.update.mock.calls[0]! as [string, Partial<ArticleRow>];
    expect(payload.status).toBe("published");
    expect(new Date(payload.published_at as string).getFullYear()).toBe(2030);
  });

  it("aperçu fidèle du contenu", async () => {
    repo.get.mockResolvedValue(article({ content: "## Chapitre\n\nTexte **important**.\n\n- un\n- deux" }));
    const { user } = renderRoutes(routes, "/actualites/a-1");
    await user.click(await screen.findByRole("tab", { name: "Aperçu" }));
    expect(screen.getByRole("heading", { name: "Chapitre", level: 2 })).toBeInTheDocument();
    expect(screen.getByText("important").tagName).toBe("STRONG");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
