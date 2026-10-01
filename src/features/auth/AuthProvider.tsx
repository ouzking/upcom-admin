import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { AppError } from "@/lib/errors";
import { can as canAccess } from "@/lib/permissions";
import { authRepository } from "@/repositories/auth.repository";
import type { AppPermission, MyAccess, ProfileRow } from "@/types";
import { ACCESS_NOTICE_MESSAGES, AuthContext, type AccessNotice, type AuthContextValue, type AuthStatus } from "./auth-context";

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  profile: ProfileRow | null;
  access: MyAccess | null;
  notice: AccessNotice | null;
}

const SIGNED_OUT: AuthState = { status: "signed_out", session: null, profile: null, access: null, notice: null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ ...SIGNED_OUT, status: "loading" });
  const [isRecovery, setIsRecovery] = useState(false);
  const queryClient = useQueryClient();
  const loadedUserId = useRef<string | null>(null);
  const noticeRef = useRef<AccessNotice | null>(null);

  /**
   * Charge profil + droits pour une session (source : base de données, jamais le JWT).
   * Compte sans rôle ou désactivé → « Accès non autorisé » et déconnexion immédiate.
   * Serveur injoignable → état « error » (la session est conservée, l'utilisateur peut réessayer).
   */
  const load = useCallback(
    async (session: Session | null): Promise<AuthStatus> => {
      if (!session) {
        loadedUserId.current = null;
        setState({ ...SIGNED_OUT, notice: noticeRef.current });
        return "signed_out";
      }
      try {
        const [profile, access] = await Promise.all([authRepository.fetchProfile(session.user.id), authRepository.fetchAccess()]);
        if (profile && access) {
          noticeRef.current = null;
          loadedUserId.current = session.user.id;
          setState({ status: "ready", session, profile, access, notice: null });
          return "ready";
        }
        noticeRef.current = profile && !profile.is_active ? "inactive" : "no_access";
        loadedUserId.current = null;
        await authRepository.signOut().catch(() => undefined);
        queryClient.clear();
        setState({ ...SIGNED_OUT, notice: noticeRef.current });
        return "signed_out";
      } catch {
        setState({ status: "error", session, profile: null, access: null, notice: null });
        return "error";
      }
    },
    [queryClient],
  );

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
      // Mot de passe redéfini : fin du parcours de récupération.
      if (event === "USER_UPDATED") setIsRecovery(false);
      if (event === "SIGNED_OUT") {
        queryClient.clear();
        setIsRecovery(false);
        loadedUserId.current = null;
        setState({ ...SIGNED_OUT, notice: noticeRef.current });
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
      noticeRef.current = null;
      const session = await authRepository.signIn(email, password);
      const status = await load(session);
      if (status === "signed_out" && noticeRef.current) throw new AppError(ACCESS_NOTICE_MESSAGES[noticeRef.current], { code: noticeRef.current });
      if (status === "error") throw new AppError("Connexion au serveur impossible. Vérifiez votre connexion Internet.", { code: "network" });
    },
    [load],
  );

  const signOut = useCallback(async () => {
    noticeRef.current = null;
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
