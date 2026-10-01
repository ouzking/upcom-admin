import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MailCheck, Send } from "lucide-react";
import { Field } from "@/components/forms/Field";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { errorMessage } from "@/lib/errors";
import { authRepository } from "@/repositories/auth.repository";

const schema = z.object({ email: z.string().trim().min(1, "L'adresse e-mail est requise.").email("Adresse e-mail invalide.") });

/**
 * Demande d'un lien de (ré)initialisation du mot de passe. Fonctionne aussi pour
 * une invitation expirée : le compte existe déjà, le lien permet de définir le mot
 * de passe. Le lien renvoie vers /auth/accept-invite (URL autorisée côté Supabase).
 */
export function ResetLinkForm({ submitLabel = "Recevoir un nouveau lien", defaultEmail = "" }: { submitLabel?: string; defaultEmail?: string }) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: defaultEmail } });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      await authRepository.requestPasswordReset(email, `${window.location.origin}/auth/accept-invite`);
      setSentTo(email);
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  if (sentTo) {
    return (
      <div className="rounded-2xl border border-success/20 bg-success-50 p-5 text-sm text-success" role="status">
        <MailCheck className="mb-3 size-6" aria-hidden />
        <p className="font-semibold">Vérifiez votre boîte de réception.</p>
        <p className="mt-1 text-ink-soft">
          Si un compte existe pour <strong>{sentTo}</strong>, un e-mail contenant un nouveau lien vient d'être envoyé (pensez aux courriers indésirables).
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <Field label="Adresse e-mail" error={errors.email?.message ?? formError ?? undefined}>
        <Input type="email" autoComplete="username" {...register("email")} />
      </Field>
      <Button type="submit" size="lg" icon={Send} loading={isSubmitting} className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
