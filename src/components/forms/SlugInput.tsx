import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { controlClass } from "@/components/ui/control";

interface SlugInputProps extends InputHTMLAttributes<HTMLInputElement> {
  prefix: string;
  invalid?: boolean;
}

/** Champ slug avec le préfixe d'URL du site public. Vide = généré par la base à partir du titre. */
export const SlugInput = forwardRef<HTMLInputElement, SlugInputProps>(function SlugInput({ prefix, invalid, className, ...props }, ref) {
  return (
    <div className={cn(controlClass(invalid), "flex h-10 items-center gap-0 overflow-hidden p-0 focus-within:border-brand-bright focus-within:ring-4 focus-within:ring-brand-bright/10")}>
      <span className="flex h-full shrink-0 items-center border-r border-line bg-mist px-3 font-mono text-xs text-muted">{prefix}</span>
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        spellCheck={false}
        autoCapitalize="off"
        className={cn("h-full min-w-0 flex-1 bg-transparent px-3 font-mono text-[13px] text-ink placeholder:text-subtle focus:outline-none", className)}
        {...props}
      />
    </div>
  );
});
