import { Sparkles, TrendingUp, Clock, Users2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { aiOwnerInsight } from "@/data/mock";

export default function AIInsights() {
  return (
    <div>
      <PageHeader title="AI Insights" subtitle="Automated weekly analysis" backTo="/owner" />

      <Card sweep className="border-(--color-accent)/25 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-(--color-accent)" />
          <p className="text-xs font-semibold tracking-wide text-(--color-accent-text) uppercase">{aiOwnerInsight.headline}</p>
        </div>
        <ul className="space-y-2">
          {aiOwnerInsight.points.map((p) => (
            <li key={p} className="text-sm text-(--color-text) leading-relaxed flex gap-2">
              <span className="mt-1.5 h-1 w-1 rounded-full bg-(--color-accent) shrink-0" />
              {p}
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="flex flex-col gap-2">
          <TrendingUp size={16} className="text-(--color-text-faint)" />
          <p className="text-sm font-medium text-(--color-text)">Revenue Forecast</p>
          <p className="text-xs text-(--color-text-muted) leading-relaxed">
            Projected ₹4.1L next month, driven by renewals in the Premium Annual tier.
          </p>
        </Card>
        <Card className="flex flex-col gap-2">
          <Clock size={16} className="text-(--color-text-faint)" />
          <p className="text-sm font-medium text-(--color-text)">Peak Hours</p>
          <p className="text-xs text-(--color-text-muted) leading-relaxed">
            6 PM – 8 PM sees 3x average footfall. Evening trainer coverage is tight on Tuesdays.
          </p>
        </Card>
        <Card className="flex flex-col gap-2">
          <Users2 size={16} className="text-(--color-text-faint)" />
          <p className="text-sm font-medium text-(--color-text)">Trainer Performance</p>
          <p className="text-xs text-(--color-text-muted) leading-relaxed">
            Neha Kapoor leads client retention this quarter at 94%, well above the branch average.
          </p>
        </Card>
      </div>
    </div>
  );
}
