import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import logo from "@/assets/brand/logo-upcom.webp";
import mark from "@/assets/brand/mark-upcom.webp";

/** Mise en page des écrans d'authentification : panneau de marque + formulaire. */
export function AuthLayout({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-paper lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-gradient-brand p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -top-40 -right-40 size-[28rem] rounded-full bg-white/5" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 -left-24 size-80 rounded-full bg-accent/20 blur-3xl" aria-hidden />
        <div className="relative flex items-center gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
            <img src={mark} alt="" className="size-full object-contain" />
          </span>
          <span className="font-display text-lg font-semibold tracking-wide">UPCOM ADMIN</span>
        </div>
        <div className="relative max-w-md">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide uppercase ring-1 ring-white/20">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            Espace d'administration
          </p>
          <h2 className="text-4xl leading-tight font-semibold">Pilotez le site et l'activité digitale d'UPCOM.</h2>
          <p className="mt-4 text-white/75">Contenus, réalisations, demandes commerciales et médias — réunis dans un seul outil.</p>
        </div>
        <p className="relative flex items-center gap-2 text-sm text-white/70">
          <ShieldCheck className="size-4" aria-hidden />
          Accès réservé aux membres habilités d'UPCOM AGENCY &amp; SERVICES.
        </p>
      </aside>

      <main className="flex items-center justify-center px-5 py-10 sm:px-10">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <img src={logo} alt="UPCOM Agency & Services" className="mb-10 h-10 w-auto lg:hidden" />
          <h1 className="text-[28px] font-semibold text-ink">{title}</h1>
          {description ? <p className="mt-2 text-sm text-muted">{description}</p> : null}
          <div className="mt-8">{children}</div>
        </motion.div>
      </main>
    </div>
  );
}
