import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Sparkles, ArrowRight, TrendingUp, Clock, Award, AlertTriangle, Loader2, Users } from "lucide-react";
import KpiCard from "@/components/ui/KpiCard";
import QuickAccessCard from "@/components/ui/QuickAccessCard";
import Card from "@/components/ui/Card";
import DonutChart from "@/components/ui/DonutChart";
import Heatmap, { type HeatmapCell } from "@/components/ui/Heatmap";
import { ownerQuickAccess } from "@/data/nav";
import { useGymBranch } from "@/hooks/useGymBranch";
import { reportApi, memberApi, aiApi, attendanceApi, type DashboardOverview } from "@/lib/endpoints";

const kpiTones = ["blue", "orange", "purple", "amber"] as const;

const miniStats = [
  { label: "Revenue Forecast", value: "—", note: "next month", icon: TrendingUp, tone: "green" as const },
  { label: "Peak Hours", value: "6–8 PM", note: "evening rush", icon: Clock, tone: "blue" as const },
  { label: "Top Trainer", value: "Assigned Staff", note: "live rating", icon: Award, tone: "amber" as const },
  { label: "Churn Risk", value: "0 members", note: "act this week", icon: AlertTriangle, tone: "pink" as const },
];

const miniStatClasses: Record<string, { bg: string; text: string }> = {
  green: { bg: "bg-(--tone-green)", text: "text-white" },
  blue: { bg: "bg-(--tone-blue)", text: "text-white" },
  amber: { bg: "bg-(--tone-amber)", text: "text-white" },
  pink: { bg: "bg-(--tone-pink)", text: "text-white" },
};

export default function OwnerDashboard() {
  const { gymId, branchId, loading: resolvingBranch } = useGymBranch();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [memberList, setMemberList] = useState<any[]>([]);
  const [expiringList, setExpiringList] = useState<any[]>([]);
  const [weeklyDigest, setWeeklyDigest] = useState<string | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [digestLoading, setDigestLoading] = useState(true);
  const [heatmapWeeks, setHeatmapWeeks] = useState<HeatmapCell[][]>([]);
  const [avgActive30d, setAvgActive30d] = useState(0);

  useEffect(() => {
    if (!gymId) return;

    setLoadingOverview(true);
    setDigestLoading(true);

    Promise.all([
      reportApi.getOverview(gymId, branchId ?? undefined).catch(() => null),
      branchId ? memberApi.list(gymId, branchId).catch(() => []) : Promise.resolve([]),
      aiApi.getWeeklyDigest(gymId).catch(() => null),
      reportApi.getExpiringMemberships(gymId).catch(() => []),
      attendanceApi.getHeatmap(gymId, branchId ?? undefined).catch(() => null),
    ])
      .then(([ovRes, memRes, digestRes, expRes, heatRes]) => {
        const zeroOverview: DashboardOverview = {
          totalActiveMembers: 0,
          totalTrainers: 0,
          todayCheckIns: 0,
          revenueThisMonth: 0,
          membershipsExpiringIn7Days: 0,
          avgAttendanceRate30d: 0,
        };
        setOverview(ovRes || zeroOverview);

        const mList = Array.isArray(memRes) ? memRes : memRes?.members || [];
        setMemberList(mList);

        const expList = Array.isArray(expRes) ? expRes : (expRes as any)?.expiringMemberships || [];
        setExpiringList(expList);

        if (digestRes?.weeklyDigest) {
          setWeeklyDigest(digestRes.weeklyDigest);
        } else {
          setWeeklyDigest("No AI weekly digest available yet. Add members and check-ins to generate insights.");
        }

        if (heatRes?.weeks) {
          setHeatmapWeeks(heatRes.weeks);
          setAvgActive30d(heatRes.avgAttendanceRate30d || 0);
        } else {
          setHeatmapWeeks([]);
          setAvgActive30d(0);
        }
      })
      .finally(() => {
        setLoadingOverview(false);
        setDigestLoading(false);
      });
  }, [gymId, branchId]);

  const activeCount = memberList.filter((m) => m.membershipStatus === "ACTIVE" || !m.membershipStatus).length;
  const expiredCount = memberList.filter((m) => m.membershipStatus === "EXPIRED").length;
  const frozenCount = memberList.filter((m) => m.membershipStatus === "FROZEN").length;
  const cancelledCount = memberList.filter((m) => m.membershipStatus === "CANCELLED").length;

  const totalMembersCount = overview?.totalActiveMembers ?? memberList.length;

  const kpis = overview
    ? [
        { label: "Members", value: String(totalMembersCount), icon: "Users" },
        { label: "Revenue (this month)", value: `₹${(overview.revenueThisMonth || 0).toLocaleString("en-IN")}`, icon: "IndianRupee" },
        { label: "Trainers", value: String(overview.totalTrainers), icon: "Dumbbell" },
        { label: "Expiring in 7d", value: String(expiringList.length || overview.membershipsExpiringIn7Days || 0), icon: "AlertTriangle" },
      ]
    : [];

  const statusSegments = [
    { label: "Active", value: activeCount, color: "var(--tone-green)" },
    { label: "Expired", value: expiredCount, color: "var(--tone-amber)" },
    { label: "Frozen", value: frozenCount, color: "var(--tone-blue)" },
    { label: "Cancelled", value: cancelledCount, color: "var(--tone-pink)" },
  ];

  return (
    <div className="space-y-6">
      {resolvingBranch || loadingOverview ? (
        <div className="flex items-center justify-center p-12 text-sm text-(--color-text-muted) gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-(--color-accent)" /> Loading dashboard metrics...
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {kpis.map((k, i) => (
            <KpiCard key={k.label} {...k} tone={kpiTones[i % kpiTones.length]} />
          ))}
        </div>
      )}

      {/* AI Assistant Banner */}
      <Card sweep className="border-(--color-accent)/20 bg-gradient-to-r from-(--color-accent)/5 to-transparent">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--color-accent) text-(--color-navbar) shadow-md">
              <Sparkles size={20} strokeWidth={2} />
            </span>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-(--color-accent-text)">AI Gym Co-Pilot</span>
                <span className="rounded-full bg-(--color-accent-soft) px-2 py-0.5 text-[10px] font-semibold text-(--color-accent-text)">LIVE</span>
              </div>
              {digestLoading ? (
                <p className="text-xs text-(--color-text-muted) flex items-center gap-1.5 py-1">
                  <Loader2 size={13} className="animate-spin text-(--color-accent)" /> Generating AI weekly digest...
                </p>
              ) : (
                <p className="text-sm font-medium text-(--color-text) leading-relaxed whitespace-pre-line">{weeklyDigest}</p>
              )}
            </div>
          </div>
          <Link
            to="/owner/ai-insights"
            className="flex items-center gap-1.5 rounded-full bg-(--color-accent) text-(--color-navbar) text-xs font-bold px-4 py-2 hover:opacity-90 transition-opacity shrink-0"
          >
            AI Insights <ArrowRight size={14} />
          </Link>
        </div>
      </Card>

      {/* Quick Access */}
      <div>
        <p className="text-xs font-medium tracking-wide text-(--color-text-faint) uppercase mb-3">Quick access</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {ownerQuickAccess.map((item) => (
            <QuickAccessCard key={item.path} {...item} />
          ))}
        </div>
      </div>

      {/* Charts section */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-(--color-border)/60">
            <div>
              <p className="text-xs font-bold tracking-wider text-(--color-text-faint) uppercase flex items-center gap-2">
                <Users size={15} className="text-(--color-accent)" /> Member Status Distribution
              </p>
              <p className="text-[11px] text-(--color-text-muted) mt-0.5">Live breakdown across active membership tiers</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-(--color-accent)/10 text-(--color-accent)">
              {memberList.length} Members
            </span>
          </div>
          <DonutChart segments={statusSegments} centerValue={String(memberList.length)} centerLabel="Total Members" />
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold tracking-wide text-(--color-text-faint) uppercase">Check-in frequency (14 Weeks)</p>
            <span className="font-mono text-xs text-(--color-text-muted)">
              Avg {avgActive30d || overview?.avgAttendanceRate30d || 0}% active
            </span>
          </div>
          <Heatmap weeks={heatmapWeeks} />
        </Card>
      </div>

      {/* Mini stats footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {miniStats.map(({ label, value, icon: Icon, tone }) => {
          const { bg, text } = miniStatClasses[tone];
          return (
            <Card key={label} className="flex items-center gap-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg} ${text}`}>
                <Icon size={18} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold text-(--color-text) truncate">{value}</p>
                <p className="text-[11px] text-(--color-text-muted) truncate">{label}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
