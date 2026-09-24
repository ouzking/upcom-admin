import { useState } from "react";
import { LogOut, RotateCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthLayout } from "@/layouts/AuthLayout";
import { useAuth } from "../auth-context";

/** Compte authentifié mais sans rôle actif : aucun accès (la RLS le traite comme un visiteur). */
export function NoAccessPage() {
  const { session, profile, signOut, refresh } = useAuth();
  const [checking, setChecking] = useState(false);
  const inactive = profile && !profile.is_active;

  return (
    <AuthLayout title={inactive ? "Compte désactivé" : "Accès en attente"}>
      <div className="rounded-2xl border border-warning/20 bg-warning-50 p-5 text-sm text-ink-soft">
        <ShieldAlert className="mb-3 size-6 text-warning" aria-hidden />
        <p>
          Vous êtes connecté(e) avec <strong className="text-ink">{session?.user.email}</strong>
          {inactive
            ? ", mais ce compte a été désactivé."
            : ", mais aucun rôle ne vous a encore été attribué."}
        </p>
        <p className="mt-2">Contactez un super administrateur d'UPCOM pour obtenir l'accès.</p>
      </div>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button
          variant="secondary"
          icon={RotateCw}
          loading={checking}
          onClick={async () => {
            setChecking(true);
            await refresh().finally(() => setChecking(false));
          }}
        >
          Vérifier à nouveau
        </Button>
        <Button variant="ghost" icon={LogOut} onClick={() => void signOut()}>
          Se déconnecter
        </Button>
      </div>
    </AuthLayout>
  );
}
