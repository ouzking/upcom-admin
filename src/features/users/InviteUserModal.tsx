import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Mail, Send } from "lucide-react";
import { useToast } from "@/components/feedback/toast-context";
import { Field } from "@/components/forms/Field";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { errorMessage } from "@/lib/errors";
import { ROLE_LABELS } from "@/lib/labels";
import { usersRepository } from "@/repositories/users.repository";
import type { AppRole } from "@/types";

const schema = z.object({
  email: z.string().trim().min(1, "L'adresse e-mail est requise.").email("Adresse e-mail invalide."),
  full_name: z.string().trim().max(120, "120 caractères maximum."),
  role: z.string().min(1, "Choisissez un rôle."),
});

type Values = z.infer<typeof schema>;

interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
  roles: AppRole[];
  onInvited: () => Promise<unknown>;
}

/** Invitation via l'Edge Function `admin-invite-user` (Admin API Auth, côté serveur uniquement). */
export function InviteUserModal({ open, onClose, roles, onInvited }: InviteUserModalProps) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", full_name: "", role: "editor" } });

  const invite = useMutation({
    mutationFn: (values: Values) =>
      usersRepository.invite({ email: values.email, full_name: values.full_name || null, role: values.role as AppRole }),
    onSuccess: async (result) => {
      toast.success("Invitation envoyée.", `${result.email} recevra un e-mail pour activer son compte.`);
      reset();
      await onInvited();
      onClose();
    },
    onError: (error) => {
      const message = errorMessage(error);
      if (/existe déjà/i.test(message)) setError("email", { message });
      else toast.error(message);
    },
  });

  const close = () => {
    if (invite.isPending) return;
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      dismissible={!invite.isPending}
      title="Inviter un membre"
      description="La personne recevra un e-mail pour définir son mot de passe. Son rôle est attribué immédiatement."
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={invite.isPending}>
            Annuler
          </Button>
          <Button icon={Send} loading={invite.isPending} onClick={() => void handleSubmit((values) => invite.mutate(values))()}>
            Envoyer l'invitation
          </Button>
        </>
      }
    >
      <form
        className="space-y-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit((values) => invite.mutate(values))();
        }}
      >
        <Field label="Adresse e-mail" required error={errors.email?.message}>
          <Input type="email" icon={Mail} autoComplete="off" {...register("email")} data-autofocus />
        </Field>
        <Field label="Nom complet" error={errors.full_name?.message}>
          <Input autoComplete="off" {...register("full_name")} />
        </Field>
        <Field label="Rôle" required error={errors.role?.message}>
          <Select {...register("role")}>
            {roles.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        </Field>
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
