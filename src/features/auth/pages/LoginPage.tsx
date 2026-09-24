import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router";
import { z } from "zod";
import { AlertCircle, LogIn, Mail } from "lucide-react";
import { Field } from "@/components/forms/Field";
import { Button } from "@/components/ui/Button";
import { Input, PasswordInput } from "@/components/ui/Input";
import { errorMessage } from "@/lib/errors";
import { AuthLayout } from "@/layouts/AuthLayout";
import { redirectTarget, useAuth } from "../auth-context";

const schema = z.object({
  email: z.string().trim().min(1, "L'adresse e-mail est requise.").email("Adresse e-mail invalide."),
  password: z.string().min(1, "Le mot de passe est requis."),
});

type LoginValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(null);
    try {
      await signIn(email, password);
      navigate(redirectTarget(location.state), { replace: true });
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  return (
    <AuthLayout title="Connexion" description="Identifiez-vous pour accéder au back-office UPCOM.">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {formError ? (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger-50 px-4 py-3 text-sm text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {formError}
          </div>
        ) : null}

        <Field label="Adresse e-mail" error={errors.email?.message}>
          <Input type="email" autoComplete="username" icon={Mail} placeholder="prenom@entreprise.com" {...register("email")} />
        </Field>

        <Field
          label="Mot de passe"
          error={errors.password?.message}
          labelAction={
            <Link to="/auth/forgot-password" className="text-[13px] font-semibold text-brand-bright hover:underline">
              Mot de passe oublié ?
            </Link>
          }
        >
          <PasswordInput autoComplete="current-password" {...register("password")} />
        </Field>

        <Button type="submit" size="lg" icon={LogIn} loading={isSubmitting} className="w-full">
          Se connecter
        </Button>
      </form>
      <p className="mt-8 text-center text-[13px] text-muted">Pas de compte ? L'accès se fait uniquement sur invitation d'un administrateur.</p>
    </AuthLayout>
  );
}
