import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { ForbiddenState, FullPageLoader } from "@/components/feedback/States";
import type { AppPermission } from "@/types";
import { redirectTarget, useAuth } from "./auth-context";
import { NoAccessPage } from "./pages/NoAccessPage";

/**
 * Routes protégées : session obligatoire + profil actif avec rôle.
 * (Confort d'interface : sans ces droits, la RLS refuserait de toute façon les données.)
 */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <FullPageLoader />;
  if (status === "signed_out") {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }
  if (status === "no_access") return <NoAccessPage />;
  return <Outlet />;
}

/**
 * Pages publiques d'authentification : un utilisateur connecté est renvoyé vers
 * la page qu'il demandait avant la connexion (ou le tableau de bord).
 */
export function RedirectIfAuthenticated() {
  const { status, isRecovery } = useAuth();
  const location = useLocation();
  if (status === "loading") return <FullPageLoader />;
  if (status === "ready" && !isRecovery) return <Navigate to={redirectTarget(location.state)} replace />;
  return <Outlet />;
}

/** Affiche le contenu seulement si l'utilisateur détient au moins une des permissions. */
export function RequirePermission({ anyOf, children }: { anyOf: AppPermission[]; children: ReactNode }) {
  const { can } = useAuth();
  if (!anyOf.some(can)) return <ForbiddenState />;
  return <>{children}</>;
}

/** Variante déclarative pour masquer un élément d'interface. */
export function Can({ permission, children, fallback = null }: { permission: AppPermission; children: ReactNode; fallback?: ReactNode }) {
  const { can } = useAuth();
  return <>{can(permission) ? children : fallback}</>;
}
