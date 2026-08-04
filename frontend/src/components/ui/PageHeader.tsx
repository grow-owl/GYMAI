import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function PageHeader({
  title,
  subtitle,
  backTo,
  action,
}: {
  title: string;
  subtitle?: string;
  backTo?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-3 min-w-0">
        {backTo && (
          <Link
            to={backTo}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-(--color-border) text-(--color-text-muted) hover:text-(--color-text) hover:border-(--color-text-faint) transition-colors"
          >
            <ChevronLeft size={18} />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="font-display text-lg sm:text-xl font-semibold text-(--color-text) truncate">{title}</h1>
          {subtitle && <p className="text-xs sm:text-sm text-(--color-text-muted) mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
