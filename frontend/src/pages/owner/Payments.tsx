import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { ownerRevenue } from "@/data/mock";

export default function Payments() {
  return (
    <div>
      <PageHeader title="Payments" subtitle="Revenue overview, this month" backTo="/owner" />
      <Card sweep className="mb-4">
        <p className="text-xs text-(--color-text-muted) mb-1">Total revenue</p>
        <div className="flex items-baseline gap-2">
          <p className="font-display text-3xl font-semibold text-(--color-text)">{ownerRevenue.total}</p>
          <span className="text-sm font-medium text-(--color-good)">{ownerRevenue.delta}</span>
        </div>
      </Card>
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <p className="text-sm font-semibold text-(--color-good)">{ownerRevenue.collected}</p>
          <p className="text-xs text-(--color-text-faint) mt-1">Collected</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-(--color-warn)">{ownerRevenue.pending}</p>
          <p className="text-xs text-(--color-text-faint) mt-1">Pending</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-(--color-danger)">{ownerRevenue.overdue}</p>
          <p className="text-xs text-(--color-text-faint) mt-1">Overdue</p>
        </Card>
      </div>
    </div>
  );
}
