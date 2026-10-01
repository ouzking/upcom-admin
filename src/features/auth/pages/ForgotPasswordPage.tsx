import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { AuthLayout } from "@/layouts/AuthLayout";
import { ResetLinkForm } from "../ResetLinkForm";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout title="Mot de passe oublié" description="Recevez un lien sécurisé pour définir un nouveau mot de passe.">
      <ResetLinkForm submitLabel="Envoyer le lien" />
      <Link to="/login" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-bright hover:underline">
        <ArrowLeft className="size-4" aria-hidden />
        Retour à la connexion
      </Link>
    </AuthLayout>
  );
}
