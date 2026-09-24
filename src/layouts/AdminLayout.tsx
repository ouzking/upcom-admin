import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ExternalLink, LogOut, Menu, UserRound, X } from "lucide-react";
import { useConfirm } from "@/components/feedback/confirm-context";
import { useToast } from "@/components/feedback/toast-context";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown } from "@/components/ui/Dropdown";
import { env } from "@/config/env";
import { displayName, useAuth } from "@/features/auth/auth-context";
import { NotificationsMenu } from "@/features/notifications/NotificationsMenu";
import { NotificationWatcher } from "@/features/notifications/NotificationWatcher";
import { ROLE_LABELS } from "@/lib/labels";
import { Sidebar } from "./Sidebar";

export function AdminLayout() {
  const { profile, access, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();

  // Ferme le menu mobile à chaque navigation.
  const [previousPath, setPreviousPath] = useState(location.pathname);
  if (previousPath !== location.pathname) {
    setPreviousPath(location.pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const handleSignOut = async () => {
    const ok = await confirm({ title: "Se déconnecter ?", description: "Vous devrez vous identifier à nouveau pour accéder au back-office.", confirmLabel: "Se déconnecter" });
    if (!ok) return;
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch {
      toast.error("Une erreur est survenue.");
    }
  };

  const name = displayName(profile);

  return (
    <div className="min-h-dvh bg-mist">
      <NotificationWatcher />
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-lg focus:bg-paper focus:px-4 focus:py-2 focus:shadow-pop">
        Aller au contenu
      </a>

      {/* Sidebar fixe (≥ lg) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <Sidebar onSignOut={handleSignOut} />
      </aside>

      {/* Sidebar mobile / tablette (tiroir) */}
      <AnimatePresence>
        {mobileOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div className="absolute inset-0 bg-brand-night/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside
              className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-pop"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              aria-label="Menu"
            >
              <Sidebar onNavigate={() => setMobileOpen(false)} onSignOut={handleSignOut} />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 -right-12 inline-flex size-9 items-center justify-center rounded-full bg-paper text-ink shadow-pop"
                aria-label="Fermer le menu"
              >
                <X className="size-5" aria-hidden />
              </button>
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-paper/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex size-10 items-center justify-center rounded-xl text-ink-soft hover:bg-brand-50 lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <Menu className="size-5" aria-hidden />
          </button>

          <div className="flex-1" />

          {env.publicSiteUrl ? (
            <a
              href={env.publicSiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-muted transition-colors hover:bg-brand-50 hover:text-brand sm:inline-flex"
            >
              Voir le site
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          ) : null}

          <NotificationsMenu />

          <Dropdown
            trigger={(props) => (
              <button type="button" {...props} className="flex items-center gap-2.5 rounded-xl py-1.5 pr-2 pl-1.5 transition-colors hover:bg-mist">
                <Avatar name={name} size="sm" />
                <span className="hidden text-left leading-tight md:block">
                  <span className="block max-w-40 truncate text-sm font-semibold text-ink">{name}</span>
                  <span className="block text-xs text-muted">{access ? ROLE_LABELS[access.role] : ""}</span>
                </span>
                <ChevronDown className="hidden size-4 text-subtle md:block" aria-hidden />
              </button>
            )}
            items={[
              { label: "Mon compte", icon: UserRound, onSelect: () => navigate("/compte") },
              "separator",
              { label: "Déconnexion", icon: LogOut, tone: "danger", onSelect: () => void handleSignOut() },
            ]}
          />
        </header>

        <main id="contenu" className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
        <footer className="mx-auto max-w-[1400px] px-4 pb-6 text-xs text-subtle sm:px-6 lg:px-8">
          UPCOM AGENCY &amp; SERVICES · Back-office ·{" "}
          <Link to="/compte" className="hover:text-brand">
            {profile?.email}
          </Link>
        </footer>
      </div>
    </div>
  );
}
