import { vi } from "vitest";

/**
 * Faux client Supabase minimal : enregistre chaque chaîne d'appels
 * (`from("t").delete().in("id", […])`) et renvoie la réponse programmée
 * pour la table et l'opération. Suffisant pour tester la logique des repositories.
 */
export interface RecordedCall {
  table: string;
  operation: "select" | "insert" | "update" | "upsert" | "delete";
  payload?: unknown;
  filters: [string, ...unknown[]][];
}

type Responder = (call: RecordedCall) => { data: unknown; error: unknown };

export function createSupabaseMock(responder: Responder) {
  const calls: RecordedCall[] = [];

  const from = vi.fn((table: string) => {
    const call: RecordedCall = { table, operation: "select", filters: [] };
    const builder: Record<string, unknown> = {};
    const chain = (name: string) =>
      (...args: unknown[]) => {
        if (["select", "insert", "update", "upsert", "delete"].includes(name) && (name !== "select" || call.operation === "select")) {
          if (name !== "select") {
            call.operation = name as RecordedCall["operation"];
            call.payload = args[0];
          }
        } else {
          call.filters.push([name, ...args]);
        }
        return builder;
      };
    for (const name of ["select", "insert", "update", "upsert", "delete", "eq", "neq", "in", "order", "range", "limit", "or", "gt", "not", "single", "maybeSingle"]) {
      builder[name] = chain(name);
    }
    builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
      calls.push(call);
      return Promise.resolve(responder(call)).then(resolve, reject);
    };
    return builder;
  });

  return { client: { from }, calls };
}
