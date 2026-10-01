import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router";
import type { Session } from "@supabase/supabase-js";
import { z } from "zod";
import { KeyRound, LinkIcon } from "lucide-react";
import { useToast } from "@/components/feedback/toast-context";
import { Field } from "@/components/forms/Field";
import { Button } from "@/components/ui/Button";
import { Input, PasswordInput } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { errorMessage } from "@/lib/errors";
import { AuthLayout } from "@/layouts/AuthLayout";
import { authLinkErrorMessage, initialAuthLink } from "@/lib/authLink";
import { authRepository } from "@/repositories/auth.repository";
import { ACCESS_NOTICE_MESSAGES, useAuth } from "../auth-context";
import { passwordSchema } from "../password";
import { PasswordStrength } from "../PasswordStrength";
import { ResetLinkForm } from "../ResetLinkForm";

type Mode = "invite" | "reset";

const schema = z
  .object({
    fullName: z.string().trim().max(120, "120 caractères maximum."),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, { path: ["confirm"], message: "Les mots de passe ne correspondent pas." });

type Values = z.infer<typeof schema>;

/**
 * Définition du mot de passe après un lien reçu par e-mail.
 *
 * Supabase renvoie invitations ET « mot de passe oublié » vers /auth/accept-invite
 * (ADMIN_INVITE_REDIRECT_URL) : le type réel est lu dans le lien (#type=invite|recovery)
 * ou déduit de l'événement PASSWORD_RECOVERY. La session présente dans l'URL est
 * ouverte automatiquement par supabase-js (detectSessionInUrl).
 */
export default function SetPasswordPage({ mode: routeMode }: { mode: Mode }) {
  const { status, session, isRecovery, notice } = useAuth();
  const mode: Mode = initialAuthLink.type === "recovery" || isRecovery ? "reset" : initialAuthLink.type === "invite" ? "invite" : routeMode;
  const title = mode === "invite" ? "Activez votre compte" : "Nouveau mot de passe";
  const linkError = authLinkErrorMessage(initialAuthLink);

  if (status === "loading") {
    return (
      <AuthLayout title={title}>
        <div className="flex items-center gap-3 text-sm text-muted" role="status">
          <Spinner className="text-brand" /> Vérification du lien…
        </div>
      </AuthLayout>
    );
  }

  // Lien valide mais compte sans rôle / désactivé : la session a été fermée par sécurité.
  if (!session && notice) {
    return (
      <AuthLayout title="Accès non autorisé">
        <p className="rounded-2xl border border-warning/25 bg-warning-50 p-5 text-sm text-ink-soft" role="alert">
          {ACCESS_NOTICE_MESSAGES[notice]}
        </p>
        <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-brand-bright hover:underline">
          Retour à la connexion
        </Link>
      </AuthLayout>
    );
  }

  if (!session || linkError) {
    return (
      <AuthLayout title="Lien expiré ou déjà utilisé" description={linkError ?? "Ce lien n'est plus valide : il a peut-être déjà servi ou dépassé sa durée de validité."}>
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-line bg-mist p-4 text-sm text-ink-soft" role="alert">
          <LinkIcon className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
          Indiquez votre adresse e-mail : vous recevrez un nouveau lien pour {mode === "invite" ? "activer votre compte" : "choisir votre mot de passe"}.
        </div>
        <ResetLinkForm />
        <Link to="/login" className="mt-8 inline-block text-sm font-semibold text-brand-bright hover:underline">
          Retour à la connexion
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={title}
      description={
        mode === "invite"
          ? `Choisissez votre mot de passe pour ${session.user.email ?? "votre compte"}.`
          : `Choisissez un nouveau mot de passe pour ${session.user.email ?? "votre compte"}.`
      }
    >
      <SetPasswordForm mode={mode} session={session} />
    </AuthLayout>
  );
}

function SetPasswordForm({ mode, session }: { mode: Mode; session: Session }) {
  const { profile, refresh } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: profile?.full_name ?? "", password: "", confirm: "" },
  });
  const password = useWatch({ control, name: "password" });

  const onSubmit = handleSubmit(async ({ fullName, password: newPassword }) => {
    setFormError(null);
    try {
      await authRepository.updatePassword(newPassword);
      if (mode === "invite" && fullName) await authRepository.updateMyName(session.user.id, fullName);
      await refresh();
      toast.success(mode === "invite" ? "Bienvenue sur UPCOM ADMIN." : "Mot de passe mis à jour.");
      navigate("/", { replace: true });
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {formError ? (
        <p role="alert" className="rounded-xl border border-danger/20 bg-danger-50 px-4 py-3 text-sm text-danger">
          {formError}
        </p>
      ) : null}
      {mode === "invite" ? (
        <Field label="Nom complet" error={errors.fullName?.message} hint="Affiché aux autres membres du back-office.">
          <Input autoComplete="name" {...register("fullName")} />
        </Field>
      ) : null}
      <Field label="Nouveau mot de passe" error={errors.password?.message}>
        <PasswordInput autoComplete="new-password" {...register("password")} />
      </Field>
      <PasswordStrength value={password} />
      <Field label="Confirmation" error={errors.confirm?.message}>
        <PasswordInput autoComplete="new-password" {...register("confirm")} />
      </Field>
      <Button type="submit" size="lg" icon={KeyRound} loading={isSubmitting} className="w-full">
        {mode === "invite" ? "Activer mon compte" : "Enregistrer le mot de passe"}
      </Button>
    </form>
  );
}
