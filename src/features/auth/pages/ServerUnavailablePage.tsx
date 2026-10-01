import { useState } from "react";
import { LogOut, RotateCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthLayout } from "@/layouts/AuthLayout";
import { useAuth } from "../auth-context";

/** Droits illisibles (serveur injoignable) : la session est conservée, l'utilisateur réessaie. */
export function ServerUnavailablePage() {
  const { refresh, signOut } = useAuth();
  const [retrying, setRetrying] = useState(false);

  return (
    <AuthLayout title="Connexion au serveur impossible">
      <div className="rounded-2xl border border-line bg-mist p-5 text-sm text-ink-soft" role="alert">
        <WifiOff className="mb-3 size-6 text-muted" aria-hidden />
        <p>Vos droits n'ont pas pu être vérifiés. Vérifiez votre connexion Internet, puis réessayez.</p>
      </div>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button
          icon={RotateCw}
          loading={retrying}
          onClick={async () => {
            setRetrying(true);
            await refresh().finally(() => setRetrying(false));
          }}
        >
          Réessayer
        </Button>
        <Button variant="ghost" icon={LogOut} onClick={() => void signOut()}>
          Se déconnecter
        </Button>
      </div>
    </AuthLayout>
  );
}
