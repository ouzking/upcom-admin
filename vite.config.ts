/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv, type Plugin } from "vite";

/**
 * Garde-fou de build : sur Netlify ou en CI, un build de production sans projet
 * Supabase hébergé valide ÉCHOUE, au lieu de publier un back-office inutilisable
 * (ex. pointant vers http://127.0.0.1:54321).
 */
function supabaseConfigGuard(): Plugin {
  return {
    name: "upcom-supabase-config-guard",
    apply: "build",
    configResolved(config) {
      if (config.mode === "test") return;
      const vars = loadEnv(config.mode, process.cwd(), "VITE_");
      const url = vars.VITE_SUPABASE_URL?.trim() ?? "";
      const key = (vars.VITE_SUPABASE_PUBLISHABLE_KEY || vars.VITE_SUPABASE_ANON_KEY || "").trim();
      const problems: string[] = [];
      if (!url) problems.push("VITE_SUPABASE_URL est vide");
      else if (!/^https:\/\//.test(url) || /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(url)) problems.push(`VITE_SUPABASE_URL doit être l'adresse HTTPS du projet en ligne (reçu : ${url})`);
      if (!key) problems.push("VITE_SUPABASE_PUBLISHABLE_KEY est vide");
      else if (key.startsWith("sb_secret_") || /service_role/.test(key)) problems.push("la clé fournie est une clé SECRÈTE : utilisez la clé publishable");
      if (!problems.length) return;
      const message = `Configuration Supabase invalide : ${problems.join(" ; ")}.`;
      // Hébergeur / CI : bloquant. Poste de développement : simple avertissement.
      if (process.env.NETLIFY === "true" || process.env.CI) throw new Error(message);
      config.logger.warn(`
⚠ ${message} (build local : non bloquant)
`);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), supabaseConfigGuard()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("react-router")) return "router";
          if (id.includes("@tanstack")) return "query";
          if (id.includes("framer-motion") || id.includes("motion-dom") || id.includes("motion-utils")) return "motion";
          if (/node_modules[\\/](zod|react-hook-form|@hookform)[\\/]/.test(id)) return "forms";
          if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "react";
          return undefined;
        },
      },
    },
  },
  // Le back-office tourne sur 5174 (site public : 5173) — cf. site_url et redirections Auth du backend.
  server: { port: 5174, strictPort: true },
  preview: { port: 4174 },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    restoreMocks: true,
    // Tests d'interface complets (saisie clavier, routeur, providers) : marge pour les machines chargées.
    testTimeout: 20_000,
    // Valeurs factices : aucun appel réseau n'est effectué, les repositories sont simulés.
    env: {
      VITE_SUPABASE_URL: "http://127.0.0.1:54321",
      VITE_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
    },
  },
});
