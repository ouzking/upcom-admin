import { createBrowserRouter, RouterProvider } from "react-router";
import { Settings2 } from "lucide-react";
import { isSupabaseConfigured } from "@/config/env";
import { AppProviders } from "./providers";
import { routes } from "./routes";

const router = createBrowserRouter(routes);

export function App() {
  if (!isSupabaseConfigured) return <MissingConfiguration />;
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}

/** Écran explicite plutôt qu'une application cassée si .env.local n'est pas renseigné. */
function MissingConfiguration() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-mist px-6">
      <div className="max-w-lg rounded-2xl border border-line bg-paper p-8 shadow-card">
        <Settings2 className="mb-4 size-8 text-brand" aria-hidden />
        <h1 className="text-xl font-semibold text-ink">Configuration Supabase manquante</h1>
        <p className="mt-2 text-sm text-muted">
          Copiez <code className="rounded bg-mist px-1.5 py-0.5">.env.example</code> vers <code className="rounded bg-mist px-1.5 py-0.5">.env.local</code> et
          renseignez <code className="rounded bg-mist px-1.5 py-0.5">VITE_SUPABASE_URL</code> et{" "}
          <code className="rounded bg-mist px-1.5 py-0.5">VITE_SUPABASE_PUBLISHABLE_KEY</code> (projet Supabase partagé avec upcom-backend), puis relancez le serveur.
        </p>
      </div>
    </div>
  );
}
