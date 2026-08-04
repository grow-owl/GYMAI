import { Search, Plus } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { members } from "@/data/mock";

const statusTone = {
  active: "good",
  expiring: "warn",
  overdue: "danger",
  trial: "accent",
} as const;

export default function Members() {
  return (
    <div>
      <PageHeader
        title="Members"
        subtitle={`${members.length} showing · 1,248 total across branches`}
        backTo="/owner"
        action={
          <button className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-(--color-accent) text-white text-sm font-medium px-4 py-2">
            <Plus size={15} /> Add member
          </button>
        }
      />

      <div className="flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface) px-4 py-2.5 text-sm text-(--color-text-faint) mb-4 max-w-sm">
        <Search size={15} />
        Search members...
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-(--color-border-soft)">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--color-surface-3) text-sm font-semibold text-(--color-text)">
                  {m.name.split(" ").map((n) => n[0]).join("")}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-(--color-text) truncate">{m.name}</p>
                  <p className="text-xs text-(--color-text-faint)">
                    {m.plan} · Trainer {m.trainer} · Joined {m.joined}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {m.churnRisk === "high" && <Badge tone="danger">Churn risk</Badge>}
                <Badge tone={statusTone[m.status]}>{m.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
