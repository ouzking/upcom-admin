import { Mail, MessageCircle, Phone } from "lucide-react";
import { cn } from "@/lib/cn";
import { telHref, whatsappHref } from "@/lib/phone";

interface ContactActionsProps {
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  /** Message pré-rempli pour WhatsApp. */
  whatsappMessage: string;
  className?: string;
}

const PRIMARY = "inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-deep";
const SECONDARY =
  "inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-paper px-4 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-mist";

/** Répondre par e-mail, appeler, écrire sur WhatsApp (si un numéro exploitable est fourni). */
export function ContactActions({ name, email, phone, subject, whatsappMessage, className }: ContactActionsProps) {
  const tel = telHref(phone);
  const whatsapp = whatsappHref(phone, whatsappMessage);
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <a href={`mailto:${email}?subject=${encodeURIComponent(subject)}`} className={PRIMARY} aria-label={`Répondre par e-mail à ${name}`}>
        <Mail className="size-4" aria-hidden />
        Répondre par e-mail
      </a>
      {tel ? (
        <a href={tel} className={SECONDARY} aria-label={`Appeler ${name}`}>
          <Phone className="size-4" aria-hidden />
          Appeler
        </a>
      ) : null}
      {whatsapp ? (
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={cn(SECONDARY, "hover:border-[#25D366] hover:text-[#128C7E]")} aria-label={`Écrire à ${name} sur WhatsApp`}>
          <MessageCircle className="size-4" aria-hidden />
          WhatsApp
        </a>
      ) : null}
    </div>
  );
}
