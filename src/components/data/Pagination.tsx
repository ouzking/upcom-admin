import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "@/components/ui/Button";
import { formatNumber } from "@/lib/format";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav className="flex items-center justify-between gap-4 border-t border-line px-5 py-3" aria-label="Pagination">
      <p className="text-[13px] text-muted">
        <span className="font-semibold text-ink">
          {formatNumber(from)}–{formatNumber(to)}
        </span>{" "}
        sur {formatNumber(total)}
      </p>
      <div className="flex items-center gap-1">
        <IconButton icon={ChevronLeft} label="Page précédente" size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)} />
        <span className="min-w-16 text-center text-[13px] font-semibold text-ink-soft">
          {page} / {pageCount}
        </span>
        <IconButton icon={ChevronRight} label="Page suivante" size="sm" variant="secondary" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} />
      </div>
    </nav>
  );
}
