import { useCallback, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmContext, type ConfirmFn, type ConfirmOptions } from "./confirm-context";

/** Boîte de confirmation asynchrone : `if (await confirm({...})) { … }`. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((next) => {
    resolver.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  const danger = options?.tone === "danger";
  const Icon = danger ? AlertTriangle : Info;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={options !== null}
        onClose={() => close(false)}
        size="sm"
        title={
          <span className="flex items-center gap-3">
            <span className={danger ? "rounded-full bg-danger-50 p-2 text-danger" : "rounded-full bg-brand-50 p-2 text-brand"}>
              <Icon className="size-5" aria-hidden />
            </span>
            {options?.title}
          </span>
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => close(false)}>
              {options?.cancelLabel ?? "Annuler"}
            </Button>
            <Button variant={danger ? "danger" : "primary"} onClick={() => close(true)} data-autofocus>
              {options?.confirmLabel ?? "Confirmer"}
            </Button>
          </>
        }
      >
        {options?.description ? <div className="text-sm leading-relaxed text-ink-soft">{options.description}</div> : null}
      </Modal>
    </ConfirmContext.Provider>
  );
}
