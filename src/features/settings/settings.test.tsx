import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signInAs } from "@/test/fakes";
import { renderPage } from "@/test/render";
import type { SiteSettingsRow } from "@/types";
import SettingsPage from "./SettingsPage";

const mocks = vi.hoisted(() => ({
  settings: { get: vi.fn(), update: vi.fn() },
  site: { triggerRebuild: vi.fn(), cleanupMedia: vi.fn() },
}));

vi.mock("@/repositories/auth.repository", async () => (await import("@/test/fakes")).authModule);
vi.mock("@/repositories/settings.repository", () => ({
  settingsRepository: mocks.settings,
  socialLinksRepository: { list: vi.fn(async () => []), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));
vi.mock("@/repositories/site.repository", () => ({ siteRepository: mocks.site }));

const settings = (overrides: Partial<SiteSettingsRow> = {}): SiteSettingsRow => ({
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
  legal_form: null,
  rccm: null,
  ninea: null,
  publication_director: null,
  created_at: "2026-09-24T00:00:00Z",
  updated_at: "2026-09-24T00:00:00Z",
  ...overrides,
});

describe("Paramètres — informations légales (backend v0.3.0)", () => {
  beforeEach(() => {
    signInAs("communication_manager");
    mocks.settings.get.mockResolvedValue(settings());
    mocks.settings.update.mockImplementation(async (changes: Partial<SiteSettingsRow>) => settings({ ...changes, updated_at: "2026-10-03T10:00:00Z" }));
    mocks.site.triggerRebuild.mockResolvedValue({ status: "triggered" });
  });

  it("enregistre les 4 champs puis propose la mise à jour du site", async () => {
    const { user } = renderPage("/parametres", <SettingsPage />);
    expect(await screen.findByText("Affichées dans les mentions légales et le pied de page du site.")).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Forme juridique" }), "SARL");
    await user.type(screen.getByRole("textbox", { name: "N° RCCM" }), "SN-DKR-2026-B-00000");
    await user.type(screen.getByRole("textbox", { name: "NINEA" }), "000000000");
    await user.type(screen.getByRole("textbox", { name: "Directeur / directrice de la publication" }), "Nom Prénom");
    expect(screen.queryByRole("button", { name: "Mettre le site à jour" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(mocks.settings.update).toHaveBeenCalledWith(
        expect.objectContaining({ legal_form: "SARL", rccm: "SN-DKR-2026-B-00000", ninea: "000000000", publication_director: "Nom Prénom", email: null }),
      ),
    );
    expect(await screen.findByText(/Modifications enregistrées\./)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mettre le site à jour" }));
    await waitFor(() => expect(mocks.site.triggerRebuild).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Mise à jour du site lancée.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Mettre le site à jour" })).not.toBeInTheDocument());
  });

  it("respecte les limites de longueur (contraintes de la base)", async () => {
    const { user } = renderPage("/parametres", <SettingsPage />);
    const ninea = await screen.findByRole("textbox", { name: "NINEA" });
    expect(ninea).toHaveAttribute("maxLength", "30");
    expect(screen.getByRole("textbox", { name: "N° RCCM" })).toHaveAttribute("maxLength", "60");
    expect(screen.getByRole("textbox", { name: "Forme juridique" })).toHaveAttribute("maxLength", "120");
    expect(screen.getByRole("textbox", { name: "Directeur / directrice de la publication" })).toHaveAttribute("maxLength", "160");
    await user.type(ninea, "1".repeat(40));
    expect(ninea).toHaveValue("1".repeat(30));
  });

  it("lecture seule sans settings.manage", async () => {
    signInAs("editor");
    renderPage("/parametres", <SettingsPage />);
    expect(await screen.findByRole("textbox", { name: "NINEA" })).toBeDisabled();
  });
});
