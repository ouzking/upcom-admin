/**
 * Numéros de téléphone saisis librement par les prospects (« 77 402 74 94 »,
 * « +221 77… », « 00221 77… ») → liens d'appel et WhatsApp.
 * Sans indicatif, un numéro sénégalais à 9 chiffres (mobiles 7x, fixes 33) reçoit +221.
 */
const SENEGAL = "221";

export function internationalDigits(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("00")) digits = digits.slice(2);
  else if (!trimmed.startsWith("+") && digits.length === 9 && /^(7|33)/.test(digits)) digits = SENEGAL + digits;
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export const telHref = (phone: string | null | undefined): string | null => {
  const digits = internationalDigits(phone);
  return digits ? `tel:+${digits}` : null;
};

export const whatsappHref = (phone: string | null | undefined, message?: string): string | null => {
  const digits = internationalDigits(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
};
