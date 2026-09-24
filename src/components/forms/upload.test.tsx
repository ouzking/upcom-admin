import { useState } from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GalleryItem } from "@/repositories/projects.repository";
import { signInAs } from "@/test/fakes";
import { renderPage } from "@/test/render";
import { GalleryField } from "./GalleryField";
import { ImageField } from "./ImageField";

const media = vi.hoisted(() => ({ upload: vi.fn(), list: vi.fn(async () => []), remove: vi.fn() }));

vi.mock("@/repositories/auth.repository", async () => (await import("@/test/fakes")).authModule);
vi.mock("@/repositories/media.repository", () => ({ mediaRepository: media }));

const image = (name: string, type = "image/webp", size = 1024) => new File([new Uint8Array(size)], name, { type });

function ImageHarness() {
  const [path, setPath] = useState<string | null>(null);
  return (
    <>
      <ImageField bucket="services" folder="services/svc-1" value={path} onChange={setPath} label="Image du service" />
      <output data-testid="value">{path ?? "vide"}</output>
    </>
  );
}

function GalleryHarness() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  return (
    <>
      <GalleryField bucket="projects" folder="projects/p-1/galerie" value={items} onChange={setItems} />
      <output data-testid="gallery">{items.map((item) => item.image_path).join("|")}</output>
    </>
  );
}

describe("Upload d'images", () => {
  beforeEach(() => signInAs("editor"));

  it("téléverse une image dans le dossier du contenu et en conserve le chemin", async () => {
    media.upload.mockResolvedValue("services/svc-1/1727190000000-affiche.webp");
    const { user } = renderPage("/", <ImageHarness />);

    await user.upload(screen.getByTestId("file-input-services"), image("Affiche.webp"));

    await waitFor(() => expect(media.upload).toHaveBeenCalledWith("services", "services/svc-1", expect.any(File)));
    expect(await screen.findByTestId("value")).toHaveTextContent("services/svc-1/1727190000000-affiche.webp");
    expect(screen.getByAltText("Aperçu : Image du service")).toHaveAttribute(
      "src",
      "http://127.0.0.1:54321/storage/v1/object/public/services/services/svc-1/1727190000000-affiche.webp",
    );
  });

  it("refuse un format non autorisé sans appeler Storage", async () => {
    renderPage("/", <ImageHarness />);
    // Contourne le filtre `accept` du navigateur pour vérifier la validation applicative.
    const user = userEvent.setup({ applyAccept: false });
    await user.upload(screen.getByTestId("file-input-services"), image("contrat.pdf", "application/pdf"));
    expect(await screen.findByText("Fichier refusé")).toBeInTheDocument();
    expect(media.upload).not.toHaveBeenCalled();
    expect(screen.getByTestId("value")).toHaveTextContent("vide");
  });

  it("signale un échec d'envoi (ex. refus des policies Storage)", async () => {
    media.upload.mockRejectedValue({ message: "new row violates row-level security policy", statusCode: "403" });
    const { user } = renderPage("/", <ImageHarness />);
    await user.upload(screen.getByTestId("file-input-services"), image("photo.webp"));
    expect(await screen.findByText(/Échec de l'envoi de photo.webp/)).toBeInTheDocument();
    expect(screen.getByText(/droits nécessaires/)).toBeInTheDocument();
  });

  it("galerie : upload multiple et ordre conservé", async () => {
    media.upload.mockImplementation(async (_bucket: string, folder: string, file: File) => `${folder}/${file.name}`);
    const { user } = renderPage("/", <GalleryHarness />);

    await user.upload(screen.getByTestId("gallery-file-input"), [image("a.webp"), image("b.webp"), image("c.webp")]);

    await waitFor(() => expect(media.upload).toHaveBeenCalledTimes(3));
    expect(await screen.findByTestId("gallery")).toHaveTextContent("projects/p-1/galerie/a.webp|projects/p-1/galerie/b.webp|projects/p-1/galerie/c.webp");

    await user.click(screen.getAllByRole("button", { name: "Descendre" })[0]!);
    expect(screen.getByTestId("gallery")).toHaveTextContent("projects/p-1/galerie/b.webp|projects/p-1/galerie/a.webp|projects/p-1/galerie/c.webp");

    await user.click(screen.getAllByRole("button", { name: "Retirer de la galerie" })[2]!);
    expect(screen.getByTestId("gallery")).toHaveTextContent("projects/p-1/galerie/b.webp|projects/p-1/galerie/a.webp");
  });
});
