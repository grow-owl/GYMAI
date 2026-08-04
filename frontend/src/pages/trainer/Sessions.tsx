import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { todaysSessions } from "@/data/mock";

export default function Sessions() {
  return (
    <div>
      <PageHeader title="Today's Sessions" subtitle="Tuesday, 29 July" backTo="/trainer" />
      <div className="space-y-3">
        {todaysSessions.map((s) => (
          <Card key={s.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-(--color-text-faint) w-16 shrink-0">{s.time}</span>
              <div>
                <p className="text-sm font-medium text-(--color-text)">{s.clientName}</p>
                <p className="text-xs text-(--color-text-faint)">{s.type}</p>
              </div>
            </div>
            <Badge tone={s.status === "done" ? "good" : s.status === "missed" ? "danger" : "neutral"}>{s.status}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
