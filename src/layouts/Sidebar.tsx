import { NavLink } from "react-router";
import { LogOut } from "lucide-react";
import mark from "@/assets/brand/mark-upcom.webp";
import { visibleNavigation, type NavItem } from "@/config/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { useNotifications } from "@/features/notifications/useNotifications";
import { cn } from "@/lib/cn";

export function Sidebar({ onNavigate, onSignOut }: { onNavigate?: () => void; onSignOut: () => void }) {
  const { can } = useAuth();
  const { data } = useNotifications();
  const sections = visibleNavigation(can);

  const badgeFor = (item: NavItem): number => {
    if (item.badge === "quotes") return data?.newQuotesCount ?? 0;
    if (item.badge === "messages") return data?.newMessagesCount ?? 0;
    return 0;
  };

  return (
    <div className="flex h-full flex-col bg-brand-night text-white">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5">
        <span className="inline-flex size-9 items-center justify-center rounded-xl bg-white p-1.5">
          <img src={mark} alt="" className="size-full object-contain" />
        </span>
        <div className="leading-tight">
          <p className="font-display text-[15px] font-semibold tracking-wide">UPCOM ADMIN</p>
          <p className="text-[11px] text-white/55">Agency &amp; Services</p>
        </div>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4" aria-label="Navigation principale">
        {sections.map((section, index) => (
          <div key={section.title ?? index} className={cn(index > 0 && "mt-6")}>
            {section.title ? <p className="mb-2 px-3 text-[11px] font-bold tracking-[0.12em] text-white/40 uppercase">{section.title}</p> : null}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const badge = badgeFor(item);
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                          isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive ? <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full bg-accent" aria-hidden /> : null}
                          <item.icon className={cn("size-[18px] shrink-0", isActive ? "text-accent" : "text-white/55 group-hover:text-white/80")} aria-hidden />
                          <span className="flex-1 truncate">{item.label}</span>
                          {badge > 0 ? (
                            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white" aria-label={`${badge} nouveau(x)`}>
                              {badge > 99 ? "99+" : badge}
                            </span>
                          ) : null}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="size-[18px] text-white/55" aria-hidden />
          Déconnexion
        </button>
      </div>
    </div>
  );
}
