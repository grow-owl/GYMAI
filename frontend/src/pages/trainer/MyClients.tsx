import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { members } from "@/data/mock";

export default function MyClients() {
  const clients = members.filter((m) => m.trainer === "Rahul");
  return (
    <div>
      <PageHeader title="My Clients" subtitle={`${clients.length} assigned`} backTo="/trainer" />
      <div className="space-y-3">
        {clients.map((c) => (
          <Card key={c.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-(--color-surface-3) text-sm font-semibold text-(--color-text)">
                {c.name.split(" ").map((n) => n[0]).join("")}
              </span>
              <div>
                <p className="text-sm font-medium text-(--color-text)">{c.name}</p>
                <p className="text-xs text-(--color-text-faint)">{c.plan}</p>
              </div>
            </div>
            {c.churnRisk === "high" ? <Badge tone="danger">Needs attention</Badge> : <Badge tone="good">On track</Badge>}
          </Card>
        ))}
      </div>
    </div>
  );
}
