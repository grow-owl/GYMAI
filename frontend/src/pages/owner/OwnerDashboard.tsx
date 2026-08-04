import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Sparkles, ArrowRight, TrendingUp, Clock, Award, AlertTriangle, Activity, Loader2 } from "lucide-react";
import KpiCard from "@/components/ui/KpiCard";
import QuickAccessCard from "@/components/ui/QuickAccessCard";
import Card from "@/components/ui/Card";
import DonutChart from "@/components/ui/DonutChart";
import Heatmap, { type HeatmapCell } from "@/components/ui/Heatmap";
import { ownerQuickAccess, aiOwnerInsight, members } from "@/data/mock";
import { useGymBranch } from "@/hooks/useGymBranch";
import { reportApi, type DashboardOverview } from "@/lib/endpoints";

const kpiTones = ["blue", "orange", "purple", "amber"] as const;

const miniStats = [
  { label: "Revenue Forecast", value: "₹4.1L", note: "next month", icon: TrendingUp, tone: "green" as const },
  { label: "Peak Hours", value: "6–8 PM", note: "evening rush", icon: Clock, tone: "blue" as const },
  { label: "Top Trainer", value: "Neha K.", note: "4.9 rating", icon: Award, tone: "amber" as const },
  { label: "Churn Risk", value: "18 members", note: "act this week", icon: AlertTriangle, tone: "pink" as const },
];

const miniStatClasses: Record<string, { bg: string; text: string }> = {
  green: { bg: "bg-(--tone-green)", text: "text-white" },
  blue: { bg: "bg-(--tone-blue)", text: "text-white" },
  amber: { bg: "bg-(--tone-amber)", text: "text-white" },
  pink: { bg: "bg-(--tone-pink)", text: "text-white" },
};

// Deterministic pseudo-random weekly attendance heatmap (demo data)
function buildAttendanceWeeks(): HeatmapCell[][] {
  const weeks: HeatmapCell[][] = [];
  let seed = 7;
  for (let w = 0; w < 14; w++) {
    const week: HeatmapCell[] = [];
    for (let d = 0; d < 7; d++) {
      seed = (seed * 9301 + 49297) % 233280;
      const rand = seed / 233280;
      const weekday = d > 0 && d < 6;
      const value = Math.round(rand * (weekday ? 90 : 40));
      week.push({ label: `Week ${w + 1}, Day ${d + 1}`, value });
    }
    weeks.push(week);
  }
  return weeks;
}
const attendanceWeeks = buildAttendanceWeeks();

const planCounts = members.reduce<Record<string, number>>((acc, m) => {
  acc[m.plan] = (acc[m.plan] ?? 0) + 1;
  return acc;
}, {});
const planColors: Record<string, string> = {
  "Premium Annual": "var(--tone-purple)",
  Quarterly: "var(--tone-blue)",
  Monthly: "var(--tone-amber)",
};
const planSegments = Object.entries(planCounts).map(([label, value]) => ({
  label,
  value,
  color: planColors[label] ?? "var(--tone-teal)",
}));

export default function OwnerDashboard() {
  const { gymId, branchId, loading: resolvingBranch } = useGymBranch();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  useEffect(() => {
    if (!gymId) return;
    setLoadingOverview(true);
    reportApi
      .getOverview(gymId, branchId ?? undefined)
      .then((res) => setOverview(res))
      .catch(() => setOverview(null))
      .finally(() => setLoadingOverview(false));
  }, [gymId, branchId]);

  const kpis = overview
    ? [
        { label: "Members", value: String(overview.totalActiveMembers), icon: "Users" },
        { label: "Revenue (this month)", value: `₹${overview.revenueThisMonth.toLocaleString("en-IN")}`, icon: "IndianRupee" },
        { label: "Trainers", value: String(overview.totalTrainers), icon: "Dumbbell" },
        { label: "Expiring in 7d", value: String(overview.membershipsExpiringIn7Days), icon: "AlertTriangle" },
      ]
    : [];

  return (
    <div className="space-y-6">
      {(resolvingBranch || loadingOverview) && (
        <div className="flex items-center gap-2 text-sm text-(--color-text-faint) py-4">
          <Loader2 size={16} className="animate-spin" /> Loading live dashboard data…
        </div>
      )}

      {!resolvingBranch && !loadingOverview && !overview && (
        <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-4 text-sm text-(--color-text-muted)">
          Couldn't load live metrics for your gym yet — showing setup will populate this once your gym & branch
          are configured.
        </div>
      )}

      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {kpis.map((kpi, i) => (
            <KpiCard key={kpi.label} {...kpi} tone={kpiTones[i % kpiTones.length]} />
          ))}
        </div>
      )}

      <div>
        <p className="text-xs font-medium tracking-wide text-(--color-text-faint) uppercase mb-3">Quick access</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {ownerQuickAccess.map((item) => (
            <QuickAccessCard key={item.path} {...item} />
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Activity size={15} className="text-(--tone-blue-text)" />
            <p className="text-xs font-semibold tracking-wide text-(--color-text-faint) uppercase">
              Attendance heatmap · last 14 weeks
            </p>
          </div>
          <Heatmap weeks={attendanceWeeks} />
          <div className="flex items-center gap-1.5 mt-4 text-[10px] text-(--color-text-faint)">
            <span>Less</span>
            <span className="h-3 w-3 rounded-[3px] bg-(--color-surface-3)" />
            <span className="h-3 w-3 rounded-[3px] bg-(--tone-orange)/25" />
            <span className="h-3 w-3 rounded-[3px] bg-(--tone-orange)/50" />
            <span className="h-3 w-3 rounded-[3px] bg-(--tone-orange)/75" />
            <span className="h-3 w-3 rounded-[3px] bg-(--tone-orange)" />
            <span>More</span>
          </div>
        </Card>

        <Card>
          <p className="text-xs font-semibold tracking-wide text-(--color-text-faint) uppercase mb-4">
            Membership plan split
          </p>
          <DonutChart segments={planSegments} centerLabel="Active members" centerValue={String(members.length)} />
        </Card>
      </div>

      <Card sweep className="border-(--color-accent)/25">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-(--color-accent)" />
          <p className="text-xs font-semibold tracking-wide text-(--color-accent-text) uppercase">AI Owner Insights</p>
        </div>
        <p className="font-display font-semibold text-(--color-text) mb-2">{aiOwnerInsight.headline}</p>
        <ul className="space-y-1.5 mb-4">
          {aiOwnerInsight.points.map((p) => (
            <li key={p} className="text-sm text-(--color-text-muted) leading-relaxed flex gap-2">
              <span className="text-(--color-accent) mt-1.5 h-1 w-1 rounded-full bg-(--color-accent) shrink-0" />
              {p}
            </li>
          ))}
        </ul>
        <Link
          to="/owner/ai-insights"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-(--color-accent-text) hover:gap-2.5 transition-all"
        >
          View full analysis <ArrowRight size={15} />
        </Link>
      </Card>

      <div>
        <p className="text-xs font-medium tracking-wide text-(--color-text-faint) uppercase mb-3">
          Revenue: {overview ? `₹${overview.revenueThisMonth.toLocaleString("en-IN")}` : "—"} this month
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {miniStats.map(({ label, value, note, icon: Icon, tone }) => {
            const t = miniStatClasses[tone];
            return (
              <div
                key={label}
                data-tone={tone}
                className="glow-hover rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-4 flex flex-col gap-2"
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${t.bg} ${t.text}`}>
                  <Icon size={15} />
                </span>
                <p className="font-display text-lg font-semibold text-(--color-text)">{value}</p>
                <p className="text-xs text-(--color-text-muted)">
                  {label} <span className="text-(--color-text-faint)">· {note}</span>
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
