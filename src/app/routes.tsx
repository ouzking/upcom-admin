import type { ComponentType } from "react";
import type { RouteObject } from "react-router";
import { FullPageLoader } from "@/components/feedback/States";
import { RequirePermission, RedirectIfAuthenticated, RequireAuth } from "@/features/auth/guards";
import { AdminLayout } from "@/layouts/AdminLayout";
import { RouteErrorPage } from "@/pages/RouteErrorPage";
import type { AppPermission } from "@/types";

type PageModule = { default: ComponentType };

/** Chaque écran est chargé à la demande (code splitting). */
const page = (loader: () => Promise<PageModule>): Pick<RouteObject, "lazy"> => ({
  lazy: async () => ({ Component: (await loader()).default }),
});

/** Écran réservé à une permission (la RLS applique la même règle côté base). */
const guarded = (anyOf: AppPermission[], loader: () => Promise<PageModule>): Pick<RouteObject, "lazy"> => ({
  lazy: async () => {
    const { default: Page } = await loader();
    return {
      Component: () => (
        <RequirePermission anyOf={anyOf}>
          <Page />
        </RequirePermission>
      ),
    };
  },
});

/** CRUD d'une rubrique : liste, création, fiche. */
const crud = (path: string, list: () => Promise<PageModule>, edit: () => Promise<PageModule>): RouteObject[] => [
  { path, ...page(list) },
  { path: `${path}/nouveau`, ...page(edit) },
  { path: `${path}/:id`, ...page(edit) },
];

export const routes: RouteObject[] = [
  {
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <FullPageLoader />,
    children: [
      {
        Component: RedirectIfAuthenticated,
        children: [
          { path: "/login", ...page(() => import("@/features/auth/pages/LoginPage")) },
          { path: "/auth/forgot-password", ...page(() => import("@/features/auth/pages/ForgotPasswordPage")) },
        ],
      },
      { path: "/auth/reset-password", ...page(() => import("@/features/auth/pages/ResetPasswordRoute")) },
      { path: "/auth/accept-invite", ...page(() => import("@/features/auth/pages/AcceptInviteRoute")) },
      {
        Component: RequireAuth,
        children: [
          {
            path: "/",
            Component: AdminLayout,
            children: [
              { index: true, ...page(() => import("@/features/dashboard/DashboardPage")) },
              ...crud("services", () => import("@/features/services/ServicesListPage"), () => import("@/features/services/ServiceEditPage")),
              ...crud("realisations", () => import("@/features/projects/ProjectsListPage"), () => import("@/features/projects/ProjectEditPage")),
              ...crud("actualites", () => import("@/features/articles/ArticlesListPage"), () => import("@/features/articles/ArticleEditPage")),
              ...crud("evenements", () => import("@/features/events/EventsListPage"), () => import("@/features/events/EventEditPage")),
              ...crud("equipe", () => import("@/features/team/TeamListPage"), () => import("@/features/team/TeamMemberEditPage")),
              ...crud("temoignages", () => import("@/features/testimonials/TestimonialsListPage"), () => import("@/features/testimonials/TestimonialEditPage")),
              { path: "devis", ...guarded(["quotes.view"], () => import("@/features/quotes/QuotesListPage")) },
              { path: "devis/:id", ...guarded(["quotes.view"], () => import("@/features/quotes/QuoteDetailPage")) },
              { path: "messages", ...guarded(["contacts.view"], () => import("@/features/messages/MessagesPage")) },
              { path: "medias", ...page(() => import("@/features/media/MediaLibraryPage")) },
              { path: "parametres", ...page(() => import("@/features/settings/SettingsPage")) },
              { path: "utilisateurs", ...guarded(["users.manage"], () => import("@/features/users/UsersPage")) },
              { path: "compte", ...page(() => import("@/features/account/AccountPage")) },
              { path: "*", ...page(() => import("@/pages/NotFoundPage")) },
            ],
          },
        ],
      },
    ],
  },
];
