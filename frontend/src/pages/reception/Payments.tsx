import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { members } from "@/data/mock";

export default function Payments() {
  return (
    <div>
      <PageHeader title="Payments" subtitle="Collect & record member payments" backTo="/reception" />
      <div className="space-y-3">
        {members.map((m) => (
          <Card key={m.id} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-(--color-text)">{m.name}</p>
              <p className="text-xs text-(--color-text-faint) mt-0.5">{m.plan}</p>
            </div>
            <Badge tone={m.status === "overdue" ? "danger" : m.status === "expiring" ? "warn" : "good"}>
              {m.status === "overdue" ? "Payment due" : m.status === "expiring" ? "Renew soon" : "Paid"}
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
