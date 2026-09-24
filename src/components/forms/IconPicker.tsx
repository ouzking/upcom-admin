import type { ReactNode } from "react";
import { Ban } from "lucide-react";
import { cn } from "@/lib/cn";
import { ICON_NAMES, ICONS, type IconName } from "@/lib/icons";

interface IconPickerProps {
  value: string | null;
  onChange: (value: IconName | null) => void;
  disabled?: boolean;
  id?: string;
}

/** Choix d'une icône parmi le registre partagé avec le site public. */
export function IconPicker({ value, onChange, disabled, id }: IconPickerProps) {
  return (
    <div id={id} role="radiogroup" aria-label="Icône" className="grid grid-cols-5 gap-1.5 sm:grid-cols-8 lg:grid-cols-5 xl:grid-cols-8">
      <IconOption selected={!value} label="Aucune icône" disabled={disabled} onClick={() => onChange(null)}>
        <Ban className="size-[18px]" aria-hidden />
      </IconOption>
      {ICON_NAMES.map((name) => {
        const Icon = ICONS[name];
        return (
          <IconOption key={name} selected={value === name} label={name} disabled={disabled} onClick={() => onChange(name)}>
            <Icon className="size-[18px]" aria-hidden />
          </IconOption>
        );
      })}
    </div>
  );
}

function IconOption({ selected, label, disabled, onClick, children }: { selected: boolean; label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex aspect-square items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        selected ? "border-brand bg-brand text-white shadow-sm" : "border-line bg-paper text-ink-soft hover:border-brand-bright hover:text-brand",
      )}
    >
      {children}
    </button>
  );
}
