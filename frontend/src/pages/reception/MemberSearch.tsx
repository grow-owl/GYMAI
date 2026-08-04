import { Search } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { members } from "@/data/mock";

const statusTone = { active: "good", expiring: "warn", overdue: "danger", trial: "accent" } as const;

export default function MemberSearch() {
  return (
    <div>
      <PageHeader title="Member Search" backTo="/reception" />
      <div className="flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface) px-4 py-2.5 text-sm text-(--color-text-faint) mb-4">
        <Search size={15} />
        Search by name, phone, or QR ID...
      </div>
      <div className="space-y-3">
        {members.map((m) => (
          <Card key={m.id} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-(--color-text)">{m.name}</p>
              <p className="text-xs text-(--color-text-faint) mt-0.5">{m.plan}</p>
            </div>
            <Badge tone={statusTone[m.status]}>{m.status}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
