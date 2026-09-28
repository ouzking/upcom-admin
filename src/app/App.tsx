import type { ReactNode } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { Settings2 } from "lucide-react";
import { configProblem } from "@/config/env";
// Capture le lien d'authentification (#type=invite|recovery) avant que supabase-js ne l'efface.
import "@/lib/authLink";
import { AppProviders } from "./providers";
import { routes } from "./routes";

export function App() {
  if (configProblem) return <MissingConfiguration problem={configProblem} />;
  return (
    <AppProviders>
      <RouterProvider router={router()} />
    </AppProviders>
  );
}

// Routeur créé une seule fois, et seulement si la configuration est valide.
let appRouter: ReturnType<typeof createBrowserRouter> | null = null;
const router = () => (appRouter ??= createBrowserRouter(routes));

const Code = ({ children }: { children: string }) => <code className="rounded bg-mist px-1.5 py-0.5 text-[13px]">{children}</code>;

const MESSAGES: Record<string, { title: string; body: ReactNode }> = {
  missing: {
    title: "Configuration Supabase manquante",
    body: import.meta.env.PROD ? (
      <>
        Ce déploiement a été construit sans <Code>VITE_SUPABASE_URL</Code> et <Code>VITE_SUPABASE_PUBLISHABLE_KEY</Code>. Renseignez-les dans
        l'hébergeur (Netlify : Site configuration → Environment variables) puis relancez un déploiement : elles sont intégrées au build.
      </>
    ) : (
      <>
        Copiez <Code>.env.example</Code> vers <Code>.env.local</Code>, renseignez <Code>VITE_SUPABASE_URL</Code> et{" "}
        <Code>VITE_SUPABASE_PUBLISHABLE_KEY</Code>, puis relancez le serveur.
      </>
    ),
  },
  invalid_url: {
    title: "Adresse Supabase invalide",
    body: (
      <>
        <Code>VITE_SUPABASE_URL</Code> doit être une adresse complète, par exemple <Code>https://votre-projet.supabase.co</Code>.
      </>
    ),
  },
  local_url_in_production: {
    title: "Mauvais projet Supabase",
    body: (
      <>
        Ce déploiement pointe vers une base locale (<Code>localhost</Code> / <Code>127.0.0.1</Code>) ou une adresse non sécurisée. Indiquez l'adresse
        HTTPS du projet en ligne dans <Code>VITE_SUPABASE_URL</Code>, puis relancez le déploiement.
      </>
    ),
  },
  secret_key: {
    title: "Clé secrète détectée",
    body: (
      <>
        La clé fournie est une clé <strong>secrète</strong> (service_role / sb_secret). Elle ne doit jamais être utilisée dans le navigateur : remplacez-la
        par la clé <strong>publishable</strong> du projet et régénérez la clé secrète dans Supabase.
      </>
    ),
  },
};

/** Écran explicite plutôt qu'une application cassée ou un appel vers un serveur par défaut. */
function MissingConfiguration({ problem }: { problem: string }) {
  const message = MESSAGES[problem] ?? MESSAGES.missing!;
  return (
    <div className="flex min-h-dvh items-center justify-center bg-mist px-6">
      <div className="max-w-lg rounded-2xl border border-line bg-paper p-8 shadow-card" role="alert">
        <Settings2 className="mb-4 size-8 text-brand" aria-hidden />
        <h1 className="text-xl font-semibold text-ink">{message.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{message.body}</p>
      </div>
    </div>
  );
}
