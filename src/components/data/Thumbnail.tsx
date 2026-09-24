import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { publicUrl } from "@/lib/storage";
import type { StorageBucket } from "@/types";

/** Vignette d'une image Storage, avec repli si absente ou introuvable. */
export function Thumbnail({ bucket, path, className, rounded = "rounded-xl" }: { bucket: StorageBucket; path: string | null | undefined; className?: string; rounded?: string }) {
  const [failed, setFailed] = useState(false);
  const src = publicUrl(bucket, path);
  const base = cn("size-11 shrink-0 bg-mist ring-1 ring-line", rounded, className);
  if (!src || failed) {
    return (
      <span className={cn(base, "inline-flex items-center justify-center text-subtle")} aria-hidden>
        <ImageIcon className="size-5" />
      </span>
    );
  }
  return <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className={cn(base, "object-cover")} />;
}
