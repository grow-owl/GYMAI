import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";

const progress = [
  { name: "Amit Kumar", metric: "Bench Press", change: "+8% in 4 weeks", value: 68 },
  { name: "Rohit Das", metric: "Body Fat %", change: "-2.1% in 6 weeks", value: 54 },
  { name: "Priya Singh", metric: "5K Run Time", change: "-1m 12s", value: 76 },
];

export default function Progress() {
  return (
    <div>
      <PageHeader title="Client Progress" subtitle="Strength & body composition trends" backTo="/trainer" />
      <div className="space-y-4">
        {progress.map((p) => (
          <Card key={p.name}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-(--color-text)">{p.name}</p>
              <span className="text-xs text-(--color-good) font-medium">{p.change}</span>
            </div>
            <p className="text-xs text-(--color-text-faint) mb-2">{p.metric}</p>
            <ProgressBar value={p.value} max={100} />
          </Card>
        ))}
      </div>
    </div>
  );
}
