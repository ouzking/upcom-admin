/**
 * Paramètres du lien d'authentification reçu par e-mail (invitation, mot de passe
 * oublié), capturés AU DÉMARRAGE : supabase-js efface ensuite le fragment de l'URL
 * après avoir ouvert la session.
 *
 *   #access_token=…&type=invite | recovery
 *   #error=access_denied&error_code=otp_expired&error_description=…
 */
export interface AuthLinkInfo {
  type: string | null;
  errorCode: string | null;
  errorDescription: string | null;
}

export function parseAuthLink(hash: string, search: string): AuthLinkInfo {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const query = new URLSearchParams(search);
  const read = (name: string) => params.get(name) ?? query.get(name);
  return {
    type: read("type"),
    errorCode: read("error_code") ?? read("error"),
    errorDescription: read("error_description"),
  };
}

export const initialAuthLink: AuthLinkInfo =
  typeof window === "undefined" ? { type: null, errorCode: null, errorDescription: null } : parseAuthLink(window.location.hash, window.location.search);

/** Message français pour un lien refusé par Supabase. */
export function authLinkErrorMessage(info: AuthLinkInfo): string | null {
  if (!info.errorCode) return null;
  if (/otp_expired|expired/i.test(`${info.errorCode} ${info.errorDescription ?? ""}`)) {
    return "Ce lien a expiré ou a déjà été utilisé. Demandez un nouvel e-mail.";
  }
  return "Ce lien n'est pas valide. Demandez un nouvel e-mail.";
}
