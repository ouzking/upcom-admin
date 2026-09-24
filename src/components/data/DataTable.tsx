import type { KeyboardEvent, ReactNode } from "react";
import { useNavigate } from "react-router";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/feedback/States";
import { cn } from "@/lib/cn";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Masque la colonne sous un point de rupture (tablette / mobile). */
  hideBelow?: "sm" | "md" | "lg" | "xl";
  align?: "left" | "right";
}

interface DataTableProps<T> {
  rows: T[] | undefined;
  columns: Column<T>[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  isLoading: boolean;
  error: unknown;
  onRetry?: () => void;
  empty: ReactNode;
  caption: string;
  rowClassName?: (row: T) => string | undefined;
}

const HIDE: Record<NonNullable<Column<unknown>["hideBelow"]>, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

export function DataTable<T>({ rows, columns, rowKey, rowHref, isLoading, error, onRetry, empty, caption, rowClassName }: DataTableProps<T>) {
  const navigate = useNavigate();

  if (isLoading && !rows) return <TableSkeleton columns={Math.min(columns.length, 4)} />;
  if (error && !rows) return <ErrorState error={error} onRetry={onRetry} />;
  if (!rows?.length) return typeof empty === "string" ? <EmptyState title={empty} /> : <>{empty}</>;

  const open = (row: T) => rowHref && navigate(rowHref(row));
  const onKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (event.key === "Enter" && event.target === event.currentTarget) open(row);
  };

  return (
    <div className={cn("overflow-x-auto", isLoading && "opacity-60 transition-opacity")}>
      <table className="w-full min-w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line bg-mist/70">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "px-5 py-3 text-xs font-semibold tracking-wide whitespace-nowrap text-muted uppercase",
                  column.align === "right" && "text-right",
                  column.hideBelow && HIDE[column.hideBelow],
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              tabIndex={rowHref ? 0 : undefined}
              onClick={(event) => {
                // Les boutons / liens internes gardent leur propre comportement.
                if ((event.target as HTMLElement).closest("a, button, input, [role=menu]")) return;
                open(row);
              }}
              onKeyDown={(event) => onKeyDown(event, row)}
              className={cn(
                "transition-colors",
                rowHref && "cursor-pointer hover:bg-brand-50/40 focus-visible:bg-brand-50/60 focus-visible:outline-none",
                rowClassName?.(row),
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    "px-5 py-3.5 align-middle",
                    column.align === "right" && "text-right",
                    column.hideBelow && HIDE[column.hideBelow],
                    column.className,
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
