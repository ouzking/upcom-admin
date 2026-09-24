import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router";
import { z } from "zod";
import { ArrowLeft, MailCheck, Send } from "lucide-react";
import { Field } from "@/components/forms/Field";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { errorMessage } from "@/lib/errors";
import { AuthLayout } from "@/layouts/AuthLayout";
import { authRepository } from "@/repositories/auth.repository";

const schema = z.object({ email: z.string().trim().min(1, "L'adresse e-mail est requise.").email("Adresse e-mail invalide.") });

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      await authRepository.requestPasswordReset(email, `${window.location.origin}/auth/reset-password`);
      setSent(true);
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  return (
    <AuthLayout title="Mot de passe oublié" description="Recevez un lien sécurisé pour définir un nouveau mot de passe.">
      {sent ? (
        <div className="rounded-2xl border border-success/20 bg-success-50 p-5 text-sm text-success" role="status">
          <MailCheck className="mb-3 size-6" aria-hidden />
          <p className="font-semibold">Vérifiez votre boîte de réception.</p>
          <p className="mt-1 text-ink-soft">Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d'être envoyé.</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <Field label="Adresse e-mail" error={errors.email?.message ?? formError ?? undefined}>
            <Input type="email" autoComplete="username" {...register("email")} />
          </Field>
          <Button type="submit" size="lg" icon={Send} loading={isSubmitting} className="w-full">
            Envoyer le lien
          </Button>
        </form>
      )}
      <Link to="/login" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-bright hover:underline">
        <ArrowLeft className="size-4" aria-hidden />
        Retour à la connexion
      </Link>
    </AuthLayout>
  );
}
