import { AlertTriangle, HeartPulse } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";

const alerts = [
  { name: "Amit Kumar", score: 42, note: "High fatigue detected. Training intensity should be reduced." },
  { name: "Priya Singh", score: 58, note: "Sleep below target three nights running. Monitor closely." },
];

const stable = [
  { name: "Rohit Das", score: 88 },
  { name: "Sneha Roy", score: 91 },
];

export default function RecoveryAlerts() {
  return (
    <div>
      <PageHeader title="Recovery Alerts" subtitle="AI-scored client recovery" backTo="/trainer" />

      <p className="text-xs font-medium tracking-wide text-(--color-text-faint) uppercase mb-3">Needs attention</p>
      <div className="space-y-3 mb-6">
        {alerts.map((a) => (
          <Card key={a.name} className="border-(--color-danger)/30 bg-(--color-danger-soft)">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={15} className="text-(--color-danger)" />
              <p className="text-sm font-medium text-(--color-text)">{a.name}</p>
              <span className="ml-auto font-mono text-sm font-semibold text-(--color-danger)">{a.score}/100</span>
            </div>
            <ProgressBar value={a.score} max={100} className="bg-(--color-danger)" />
            <p className="text-sm text-(--color-text-muted) mt-2">{a.note}</p>
          </Card>
        ))}
      </div>

      <p className="text-xs font-medium tracking-wide text-(--color-text-faint) uppercase mb-3">Stable</p>
      <div className="space-y-3">
        {stable.map((s) => (
          <Card key={s.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HeartPulse size={15} className="text-(--color-good)" />
              <p className="text-sm text-(--color-text)">{s.name}</p>
            </div>
            <span className="font-mono text-sm font-semibold text-(--color-good)">{s.score}/100</span>
          </Card>
        ))}
      </div>
    </div>
  );
}
