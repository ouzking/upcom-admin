import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { KeyRound, Save, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/feedback/toast-context";
import { Field } from "@/components/forms/Field";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input, PasswordInput } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { displayName, useAuth } from "@/features/auth/auth-context";
import { passwordSchema } from "@/features/auth/password";
import { errorMessage } from "@/lib/errors";
import { PERMISSION_LABELS, ROLE_LABELS } from "@/lib/labels";
import { authRepository } from "@/repositories/auth.repository";

const passwordFormSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((values) => values.password === values.confirm, { path: ["confirm"], message: "Les mots de passe ne correspondent pas." });

export default function AccountPage() {
  const { profile, access, refresh } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(profile?.full_name ?? "");

  const saveName = useMutation({
    mutationFn: () => authRepository.updateMyName(profile?.id ?? "", name),
    onSuccess: async () => {
      toast.success("Modification enregistrée.");
      await refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({ resolver: zodResolver(passwordFormSchema), defaultValues: { password: "", confirm: "" } });
  const changePassword = useMutation({
    mutationFn: (password: string) => authRepository.updatePassword(password),
    onSuccess: () => {
      toast.success("Mot de passe mis à jour.");
      passwordForm.reset();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <>
      <PageHeader title="Mon compte" description="Vos informations personnelles et votre sécurité." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Profil" />
          <CardBody className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar name={displayName(profile)} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-ink">{displayName(profile)}</p>
                <p className="truncate text-sm text-muted">{profile?.email}</p>
                {access ? (
                  <Badge tone="brand" className="mt-1.5">
                    {ROLE_LABELS[access.role]}
                  </Badge>
                ) : null}
              </div>
            </div>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                saveName.mutate();
              }}
            >
              <Field label="Nom complet" hint="Visible par les autres membres du back-office.">
                <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} autoComplete="name" />
              </Field>
              <Field label="Adresse e-mail" hint="Pour la modifier, contactez un super administrateur.">
                <Input value={profile?.email ?? ""} readOnly />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" icon={Save} loading={saveName.isPending} disabled={name.trim() === (profile?.full_name ?? "")}>
                  Enregistrer
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Mot de passe" description="12 caractères minimum, avec minuscules, majuscules et chiffres." />
            <CardBody>
              <form className="space-y-4" noValidate onSubmit={passwordForm.handleSubmit(({ password }) => changePassword.mutate(password))}>
                <Field label="Nouveau mot de passe" error={passwordForm.formState.errors.password?.message}>
                  <PasswordInput autoComplete="new-password" {...passwordForm.register("password")} />
                </Field>
                <Field label="Confirmation" error={passwordForm.formState.errors.confirm?.message}>
                  <PasswordInput autoComplete="new-password" {...passwordForm.register("confirm")} />
                </Field>
                <div className="flex justify-end">
                  <Button type="submit" icon={KeyRound} loading={changePassword.isPending}>
                    Changer le mot de passe
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Mes permissions" description="Définies par votre rôle et appliquées par la base de données." />
            <CardBody>
              <ul className="grid gap-2 sm:grid-cols-2">
                {access?.permissions.map((permission) => (
                  <li key={permission} className="flex items-center gap-2 text-sm text-ink-soft">
                    <ShieldCheck className="size-4 shrink-0 text-success" aria-hidden />
                    {PERMISSION_LABELS[permission]}
                  </li>
                ))}
                {!access?.permissions.length ? <li className="text-sm text-muted">Consultation des contenus uniquement.</li> : null}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
