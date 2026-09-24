import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { can as canAccess } from "@/lib/permissions";
import { authRepository } from "@/repositories/auth.repository";
import type { AppPermission, MyAccess, ProfileRow } from "@/types";
import { AuthContext, type AuthContextValue, type AuthStatus } from "./auth-context";

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  profile: ProfileRow | null;
  access: MyAccess | null;
}

const SIGNED_OUT: AuthState = { status: "signed_out", session: null, profile: null, access: null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ ...SIGNED_OUT, status: "loading" });
  const [isRecovery, setIsRecovery] = useState(false);
  const queryClient = useQueryClient();
  const loadedUserId = useRef<string | null>(null);

  /** Charge profil + droits pour une session (source : base de données, jamais le JWT). */
  const load = useCallback(async (session: Session | null) => {
    if (!session) {
      loadedUserId.current = null;
      setState(SIGNED_OUT);
      return;
    }
    try {
      const [profile, access] = await Promise.all([authRepository.fetchProfile(session.user.id), authRepository.fetchAccess()]);
      loadedUserId.current = session.user.id;
      setState({ status: profile && access ? "ready" : "no_access", session, profile, access });
    } catch {
      // Droits illisibles : on refuse l'accès plutôt que d'ouvrir l'interface.
      setState({ status: "no_access", session, profile: null, access: null });
    }
  }, []);

  useEffect(() => {
    let active = true;
    authRepository
      .getSession()
      .then((session) => {
        if (active) void load(session);
      })
      .catch(() => {
        if (active) setState(SIGNED_OUT);
      });

    const unsubscribe = authRepository.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setIsRecovery(true);
      if (event === "SIGNED_OUT") {
        queryClient.clear();
        setIsRecovery(false);
        loadedUserId.current = null;
        setState(SIGNED_OUT);
        return;
      }
      // Un rafraîchissement de jeton ne change pas les droits : on met juste la session à jour.
      if (event === "TOKEN_REFRESHED" && session && session.user.id === loadedUserId.current) {
        setState((current) => ({ ...current, session }));
        return;
      }
      // SIGNED_IN est aussi émis au retour sur l'onglet : inutile de recharger le même utilisateur.
      if (event === "SIGNED_IN" && session?.user.id === loadedUserId.current) return;
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "PASSWORD_RECOVERY") {
        // Hors du callback : Supabase recommande de ne pas l'attendre (verrou interne).
        window.setTimeout(() => active && void load(session), 0);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [load, queryClient]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const session = await authRepository.signIn(email, password);
      await load(session);
    },
    [load],
  );

  const signOut = useCallback(async () => {
    try {
      await authRepository.signOut();
    } finally {
      queryClient.clear();
      loadedUserId.current = null;
      setIsRecovery(false);
      setState(SIGNED_OUT);
    }
  }, [queryClient]);

  const refresh = useCallback(async () => {
    await load(await authRepository.getSession());
  }, [load]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isRecovery,
      signIn,
      signOut,
      refresh,
      can: (permission: AppPermission) => canAccess(state.access, permission),
    }),
    [state, isRecovery, signIn, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
