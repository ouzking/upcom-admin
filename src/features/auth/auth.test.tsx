import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Outlet } from "react-router";
import { AdminLayout } from "@/layouts/AdminLayout";
import { authRepositoryFake, signInAs } from "@/test/fakes";
import { LocationProbe, renderRoutes } from "@/test/render";
import { RedirectIfAuthenticated, RequireAuth, RequirePermission } from "./guards";
import LoginPage from "./pages/LoginPage";

vi.mock("@/repositories/auth.repository", async () => (await import("@/test/fakes")).authModule);
vi.mock("@/repositories/dashboard.repository", () => ({
  dashboardRepository: {
    recentQuotes: vi.fn(async () => []),
    countQuotes: vi.fn(async () => 0),
    recentMessages: vi.fn(async () => []),
    countMessages: vi.fn(async () => 0),
    scheduledArticles: vi.fn(async () => []),
    draftCounts: vi.fn(async () => ({})),
  },
}));

const routes = [
  {
    element: (
      <>
        <Outlet />
        <LocationProbe />
      </>
    ),
    children: [
      { element: <RedirectIfAuthenticated />, children: [{ path: "/login", element: <LoginPage /> }] },
      {
        element: <RequireAuth />,
        children: [
          {
            path: "/",
            element: <AdminLayout />,
            children: [
              { index: true, element: <h1>Tableau de bord</h1> },
              {
                path: "devis",
                element: (
                  <RequirePermission anyOf={["quotes.view"]}>
                    <h1>Liste des devis</h1>
                  </RequirePermission>
                ),
              },
            ],
          },
        ],
      },
    ],
  },
];

describe("Authentification", () => {
  beforeEach(() => signInAs(null));

  it("redirige un visiteur non connecté vers /login (route protégée)", async () => {
    renderRoutes(routes, "/devis");
    expect(await screen.findByRole("heading", { name: "Connexion" })).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/login");
  });

  it("valide le formulaire de connexion", async () => {
    const { user } = renderRoutes(routes, "/login");
    await user.click(await screen.findByRole("button", { name: /se connecter/i }));
    expect(await screen.findByText("L'adresse e-mail est requise.")).toBeInTheDocument();
    expect(screen.getByText("Le mot de passe est requis.")).toBeInTheDocument();
    expect(authRepositoryFake.signIn).not.toHaveBeenCalled();
  });

  it("affiche une erreur explicite si les identifiants sont refusés", async () => {
    authRepositoryFake.signIn.mockRejectedValueOnce({ message: "Invalid login credentials", status: 400 });
    const { user } = renderRoutes(routes, "/login");
    await user.type(await screen.findByLabelText("Adresse e-mail"), "awa@upcom.test");
    await user.type(screen.getByLabelText("Mot de passe"), "mauvais-mot-de-passe");
    await user.click(screen.getByRole("button", { name: /se connecter/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Adresse e-mail ou mot de passe incorrect.");
  });

  it("connecte l'utilisateur et renvoie vers la page demandée", async () => {
    const { user } = renderRoutes(routes, "/devis");
    await screen.findByRole("heading", { name: "Connexion" });
    signInAs("commercial");
    await user.type(screen.getByLabelText("Adresse e-mail"), "awa@upcom.test");
    await user.type(screen.getByLabelText("Mot de passe"), "MotDePasse2026");
    await user.click(screen.getByRole("button", { name: /se connecter/i }));

    expect(await screen.findByRole("heading", { name: "Liste des devis" })).toBeInTheDocument();
    expect(authRepositoryFake.signIn).toHaveBeenCalledWith("awa@upcom.test", "MotDePasse2026");
    expect(screen.getByTestId("location")).toHaveTextContent("/devis");
  });

  it("restaure une session persistée sans repasser par /login", async () => {
    signInAs("editor");
    renderRoutes(routes, "/");
    expect(await screen.findByRole("heading", { name: "Tableau de bord" })).toBeInTheDocument();
  });

  it("bloque un compte sans rôle (écran « Accès en attente »)", async () => {
    signInAs("editor");
    authRepositoryFake.fetchAccess.mockResolvedValueOnce(null);
    renderRoutes(routes, "/");
    expect(await screen.findByRole("heading", { name: "Accès en attente" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Tableau de bord" })).not.toBeInTheDocument();
  });

  it("refuse une rubrique sans la permission requise", async () => {
    signInAs("editor");
    renderRoutes(routes, "/devis");
    expect(await screen.findByText("Accès réservé")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Liste des devis" })).not.toBeInTheDocument();
  });

  it("masque les entrées de menu non autorisées", async () => {
    signInAs("editor");
    renderRoutes(routes, "/");
    const nav = await screen.findAllByRole("navigation", { name: "Navigation principale" });
    expect(within(nav[0]!).getByRole("link", { name: /Services/ })).toBeInTheDocument();
    expect(within(nav[0]!).queryByRole("link", { name: /Demandes de devis/ })).not.toBeInTheDocument();
    expect(within(nav[0]!).queryByRole("link", { name: /Utilisateurs/ })).not.toBeInTheDocument();
  });

  it("déconnecte l'utilisateur après confirmation", async () => {
    signInAs("editor");
    const { user } = renderRoutes(routes, "/");
    await screen.findByRole("heading", { name: "Tableau de bord" });

    await user.click(screen.getAllByRole("button", { name: "Déconnexion" })[0]!);
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Se déconnecter" }));

    await waitFor(() => expect(authRepositoryFake.signOut).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("heading", { name: "Connexion" })).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/login");
  });
});
