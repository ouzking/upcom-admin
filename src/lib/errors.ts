/**
 * Erreurs applicatives : traduit les erreurs PostgREST / Storage / Auth /
 * Edge Functions en messages français compréhensibles par un utilisateur non
 * technique. Le détail technique reste disponible dans `cause` (console).
 */
export class AppError extends Error {
  readonly code: string | null;
  readonly field: string | null;

  constructor(message: string, options: { code?: string | null; field?: string | null; cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.code = options.code ?? null;
    this.field = options.field ?? null;
  }
}

export const GENERIC_ERROR = "Une erreur est survenue.";

interface ErrorLike {
  code?: string | number;
  message?: string;
  details?: string | null;
  hint?: string | null;
  status?: number;
  statusCode?: string | number;
}

const isErrorLike = (value: unknown): value is ErrorLike => typeof value === "object" && value !== null;

/** Contraintes connues du schéma → champ + message. */
const CONSTRAINT_MESSAGES: { match: RegExp; field: string; message: string }[] = [
  // Du plus spécifique au plus général : le premier motif reconnu l'emporte.
  { match: /_slug_key/, field: "slug", message: "Ce slug est déjà utilisé par un autre élément." },
  { match: /social_links_platform_url_key/, field: "url", message: "Ce lien existe déjà." },
  { match: /project_images_project_path_key/, field: "gallery", message: "Cette image est déjà dans la galerie." },
  { match: /events_end_after_start/, field: "end_date", message: "La date de fin doit être postérieure à la date de début." },
  { match: /articles_published_requires_date/, field: "published_at", message: "Une date de publication est requise." },
  { match: /linkedin_url/, field: "linkedin_url", message: "L'URL LinkedIn doit commencer par https://…linkedin.com/." },
  { match: /slug/, field: "slug", message: "Le slug ne peut contenir que des lettres minuscules, chiffres et tirets." },
  { match: /email/, field: "email", message: "Adresse e-mail invalide." },
  { match: /phone|whatsapp/, field: "phone", message: "Numéro de téléphone invalide." },
  { match: /url/, field: "url", message: "L'adresse doit commencer par https://." },
];

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (!isErrorLike(error)) return new AppError(GENERIC_ERROR, { cause: error });

  const code = error.code != null ? String(error.code) : null;
  const text = `${error.message ?? ""} ${error.details ?? ""}`;
  const status = Number(error.status ?? error.statusCode ?? 0);

  // Droits insuffisants (RLS, privilèges, triggers de garde).
  if (code === "42501" || status === 403 || /row-level security|permission denied/i.test(text)) {
    const custom = code === "42501" && error.message && !/row-level security|permission denied/i.test(error.message);
    return new AppError(custom ? error.message! : "Vous n'avez pas les droits nécessaires pour effectuer cette action.", {
      code: "forbidden",
      cause: error,
    });
  }
  if (code === "23505" || code === "23514" || code === "23502") {
    const known = CONSTRAINT_MESSAGES.find(({ match }) => match.test(text));
    if (known) return new AppError(known.message, { code, field: known.field, cause: error });
    return new AppError("Une donnée ne respecte pas le format attendu.", { code, cause: error });
  }
  if (code === "23503") {
    return new AppError("Cet élément est utilisé ailleurs et ne peut pas être supprimé.", { code, cause: error });
  }
  if (code === "PGRST116") return new AppError("Élément introuvable.", { code: "not_found", cause: error });
  if (status === 413 || /exceeded the maximum allowed size|too large/i.test(text)) {
    return new AppError("Le fichier dépasse la taille maximale autorisée.", { code: "file_too_large", cause: error });
  }
  if (/mime type|invalid_mime_type/i.test(text)) {
    return new AppError("Ce type de fichier n'est pas autorisé.", { code: "invalid_mime", cause: error });
  }
  if (/Invalid login credentials/i.test(text)) {
    return new AppError("Adresse e-mail ou mot de passe incorrect.", { code: "invalid_credentials", cause: error });
  }
  if (/Email not confirmed/i.test(text)) {
    return new AppError("Votre adresse e-mail n'a pas encore été confirmée.", { code: "email_not_confirmed", cause: error });
  }
  if (/Failed to fetch|NetworkError|network/i.test(text)) {
    return new AppError("Connexion au serveur impossible. Vérifiez votre connexion Internet.", { code: "network", cause: error });
  }
  return new AppError(GENERIC_ERROR, { code, cause: error });
}

export const errorMessage = (error: unknown): string => toAppError(error).message;

/** Lève une AppError si la réponse Supabase contient une erreur, sinon renvoie les données. */
export function unwrap<T>(result: { data: T; error: unknown }): NonNullable<T> {
  if (result.error) throw toAppError(result.error);
  if (result.data == null) throw new AppError("Élément introuvable.", { code: "not_found" });
  return result.data as NonNullable<T>;
}

export function assertOk(result: { error: unknown }): void {
  if (result.error) throw toAppError(result.error);
}
