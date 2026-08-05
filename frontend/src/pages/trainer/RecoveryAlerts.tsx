import { HeartPulse } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

export default function RecoveryAlerts() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Recovery Alerts"
        subtitle="AI-scored client recovery and fatigue monitoring"
        backTo="/trainer"
      />

      <Card className="flex flex-col items-center justify-center text-center py-16 px-6 space-y-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-(--color-accent-soft) text-(--color-accent) mb-2">
          <HeartPulse size={24} />
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="accent">Feature In Development</Badge>
        </div>
        <h3 className="font-display text-lg font-bold text-(--color-text)">
          Trainer Recovery & Fatigue Analytics Coming Soon
        </h3>
        <p className="text-xs text-(--color-text-muted) max-w-md">
          Automated client recovery scores, sleep trends, and fatigue risk indicators for trainers are under active development. Real-time alerts will trigger here once client wearability & wellness integrations are active.
        </p>
      </Card>
    </div>
  );
}
