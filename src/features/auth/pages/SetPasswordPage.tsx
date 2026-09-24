import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router";
import type { Session } from "@supabase/supabase-js";
import { z } from "zod";
import { Check, KeyRound, LinkIcon } from "lucide-react";
import { useToast } from "@/components/feedback/toast-context";
import { Field } from "@/components/forms/Field";
import { Button } from "@/components/ui/Button";
import { Input, PasswordInput } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { errorMessage } from "@/lib/errors";
import { AuthLayout } from "@/layouts/AuthLayout";
import { authRepository } from "@/repositories/auth.repository";
import { useAuth } from "../auth-context";
import { PASSWORD_RULES, passwordSchema } from "../password";

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
 * Définition du mot de passe après un lien e-mail :
 * - « invite » : /auth/accept-invite (ADMIN_INVITE_REDIRECT_URL du backend)
 * - « reset »  : /auth/reset-password (mot de passe oublié)
 * La session est ouverte automatiquement par Supabase à partir du jeton de l'URL.
 */
export default function SetPasswordPage({ mode }: { mode: Mode }) {
  const { status, session } = useAuth();
  const title = mode === "invite" ? "Activez votre compte" : "Nouveau mot de passe";

  if (status === "loading") {
    return (
      <AuthLayout title={title}>
        <div className="flex items-center gap-3 text-sm text-muted">
          <Spinner className="text-brand" /> Vérification du lien…
        </div>
      </AuthLayout>
    );
  }

  if (!session) {
    return (
      <AuthLayout title="Lien invalide ou expiré" description="Ce lien a déjà été utilisé ou n'est plus valide.">
        <div className="flex items-start gap-3 rounded-2xl border border-line bg-mist p-5 text-sm text-ink-soft">
          <LinkIcon className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
          {mode === "invite"
            ? "Demandez à un administrateur de vous renvoyer une invitation."
            : "Refaites une demande de réinitialisation du mot de passe."}
        </div>
        <Link to={mode === "invite" ? "/login" : "/auth/forgot-password"} className="mt-6 inline-block text-sm font-semibold text-brand-bright hover:underline">
          {mode === "invite" ? "Aller à la connexion" : "Nouvelle demande"}
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
          : "Choisissez un mot de passe robuste que vous n'utilisez nulle part ailleurs."
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
      <ul className="grid grid-cols-2 gap-1.5 text-[13px]" aria-label="Règles du mot de passe">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <li key={rule.label} className={cn("flex items-center gap-1.5", ok ? "text-success" : "text-muted")}>
              <Check className={cn("size-3.5", ok ? "opacity-100" : "opacity-30")} aria-hidden />
              {rule.label}
            </li>
          );
        })}
      </ul>
      <Field label="Confirmation" error={errors.confirm?.message}>
        <PasswordInput autoComplete="new-password" {...register("confirm")} />
      </Field>
      <Button type="submit" size="lg" icon={KeyRound} loading={isSubmitting} className="w-full">
        {mode === "invite" ? "Activer mon compte" : "Enregistrer le mot de passe"}
      </Button>
    </form>
  );
}
