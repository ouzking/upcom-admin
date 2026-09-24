import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider, useLocation, type RouteObject } from "react-router";
import { AppProviders } from "@/app/providers";

export function createTestQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
}

/** Affiche le chemin courant (assertions de navigation). */
export function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

/**
 * Rend des routes dans un routeur mémoire (data router : useBlocker disponible)
 * avec tous les providers réels de l'application.
 */
export function renderRoutes(routes: RouteObject[], initialEntry = "/") {
  const router = createMemoryRouter(
    [
      ...routes.map((route) => ({ ...route })),
      { path: "*", element: <p>Page non gérée</p> },
    ],
    { initialEntries: [initialEntry] },
  );
  const client = createTestQueryClient();
  const user = userEvent.setup();
  const view = render(
    <AppProviders client={client}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...view, user, router, client };
}

/** Rend un seul écran à une URL donnée (+ sonde de navigation). */
export function renderPage(path: string, element: ReactElement, initialEntry = path, extraRoutes: RouteObject[] = []) {
  return renderRoutes(
    [
      {
        path,
        element: (
          <>
            {element}
            <LocationProbe />
          </>
        ),
      },
      ...extraRoutes,
    ],
    initialEntry,
  );
}
