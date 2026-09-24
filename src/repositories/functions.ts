import { FunctionsHttpError } from "@supabase/supabase-js";
import { AppError, toAppError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import type { ApiResponse } from "@/types";

/**
 * Appelle une Edge Function du backend avec la session courante (JWT) et
 * déballe l'enveloppe { ok, data | error } définie par le contrat d'API.
 */
export async function invokeFunction<TResult>(name: string, body: object): Promise<TResult> {
  const { data, error } = await supabase.functions.invoke<ApiResponse<TResult>>(name, { body });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await readJson(error.context);
      if (payload && !payload.ok) {
        throw new AppError(payload.error.message, {
          code: payload.error.code,
          field: payload.error.details?.[0]?.field ?? null,
          cause: error,
        });
      }
    }
    throw toAppError(error);
  }
  if (!data) throw new AppError("Réponse vide du serveur.");
  if (!data.ok) throw new AppError(data.error.message, { code: data.error.code });
  return data.data;
}

async function readJson(context: unknown): Promise<ApiResponse<unknown> | null> {
  if (!(context instanceof Response)) return null;
  try {
    return (await context.json()) as ApiResponse<unknown>;
  } catch {
    return null;
  }
}
