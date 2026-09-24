import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

const SIZES = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-base" } as const;

export function Avatar({ name, src, size = "md", className }: { name: string | null | undefined; src?: string | null; size?: keyof typeof SIZES; className?: string }) {
  if (src) return <img src={src} alt="" className={cn("shrink-0 rounded-full object-cover ring-1 ring-line", SIZES[size], className)} />;
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-brand-50 font-bold text-brand ring-1 ring-brand-100", SIZES[size], className)}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
