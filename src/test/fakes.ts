import type { Session } from "@supabase/supabase-js";
import { vi } from "vitest";
import type { AppPermission, AppRole, MyAccess, ProfileRow } from "@/types";

/**
 * Faux repository d'authentification piloté par les tests : l'AuthProvider
 * réel est exécuté, seule la couche d'accès à Supabase est remplacée.
 * Usage : vi.mock("@/repositories/auth.repository", async () => (await import("@/test/fakes")).authModule);
 */

/** Matrice identique à role_permissions (migration 002 du backend). */
export const ROLE_PERMISSIONS: Record<AppRole, AppPermission[]> = {
  super_admin: [
    "services.manage",
    "projects.manage",
    "articles.manage",
    "events.manage",
    "team.manage",
    "testimonials.manage",
    "quotes.view",
    "quotes.manage",
    "contacts.view",
    "contacts.manage",
    "settings.manage",
    "users.manage",
  ],
  editor: ["services.manage", "projects.manage", "articles.manage", "events.manage", "team.manage", "testimonials.manage"],
  communication_manager: ["projects.manage", "articles.manage", "events.manage", "testimonials.manage", "contacts.view", "contacts.manage", "settings.manage"],
  commercial: ["quotes.view", "quotes.manage", "contacts.view", "contacts.manage"],
};

export const accessFor = (role: AppRole): MyAccess => ({ role, permissions: ROLE_PERMISSIONS[role] });

export const makeProfile = (overrides: Partial<ProfileRow> = {}): ProfileRow => ({
  id: "user-1",
  email: "awa@upcom.test",
  full_name: "Awa Diop",
  role: "editor",
  is_active: true,
  created_at: "2026-09-01T10:00:00Z",
  updated_at: "2026-09-01T10:00:00Z",
  ...overrides,
});

export const makeSession = (userId = "user-1", email = "awa@upcom.test"): Session =>
  ({ access_token: "token", refresh_token: "refresh", expires_in: 3600, token_type: "bearer", user: { id: userId, email } }) as unknown as Session;

interface AuthState {
  session: Session | null;
  profile: ProfileRow | null;
  access: MyAccess | null;
}

export const authState: AuthState = { session: null, profile: null, access: null };

/** Configure l'utilisateur connecté (ou déconnecté si role === null). */
export function signInAs(role: AppRole | null, profile: Partial<ProfileRow> = {}): void {
  if (role === null) {
    authState.session = null;
    authState.profile = null;
    authState.access = null;
    return;
  }
  authState.session = makeSession();
  authState.profile = makeProfile({ role, ...profile });
  authState.access = accessFor(role);
}

export const authRepositoryFake = {
  getSession: vi.fn(async () => authState.session),
  onAuthStateChange: vi.fn(() => () => undefined),
  signIn: vi.fn(async (email: string, password: string): Promise<Session> => {
    if (!authState.session || !email || !password) throw new Error("not configured");
    return authState.session;
  }),
  signOut: vi.fn(async () => {
    signInAs(null);
  }),
  requestPasswordReset: vi.fn(async () => undefined),
  updatePassword: vi.fn(async () => undefined),
  fetchProfile: vi.fn(async () => authState.profile),
  fetchAccess: vi.fn(async () => authState.access),
  updateMyName: vi.fn(async () => undefined),
};

export const authModule = { authRepository: authRepositoryFake };
