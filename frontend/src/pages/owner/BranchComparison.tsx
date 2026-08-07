import { useState, useEffect } from "react";
import { Building2, TrendingUp, Users, Loader2, BarChart2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { reportApi } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

export default function BranchComparison() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState("revenue");
  const [period, setPeriod] = useState("30d");
  const [data, setData] = useState<any | null>(null);

  const fetchComparison = async () => {
    if (!user?.gymId) return;
    setLoading(true);
    try {
      const res = await reportApi.getBranchComparison(user.gymId, metric, period);
      setData(res);
    } catch {
      toast.error("Failed to load branch comparison data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [user, metric, period]);

  const metrics = [
    { key: "revenue", label: "Revenue (₹)", icon: TrendingUp },
    { key: "attendance", label: "Attendance Rate", icon: Users },
    { key: "members", label: "Active Members", icon: Building2 },
    { key: "churn", label: "Churn Risk %", icon: BarChart2 },
  ];

  const periods = [
    { key: "7d", label: "Last 7 Days" },
    { key: "30d", label: "Last 30 Days" },
    { key: "90d", label: "Last 90 Days" },
  ];

  const branches = data?.branches || data?.comparison || [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Multi-Branch Analytics & Comparison"
        subtitle="Side-by-side performance benchmarks across your gym locations"
        backTo="/owner"
      />

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {metrics.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setMetric(key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-colors shrink-0 ${
                metric === key
                  ? "bg-(--color-accent) text-(--color-navbar) font-bold"
                  : "bg-(--color-surface-2) text-(--color-text-muted) hover:text-(--color-text)"
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-(--color-surface-2) p-1 rounded-full border border-(--color-border) shrink-0 self-start sm:self-auto">
          {periods.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-3 py-1 text-[11px] font-medium rounded-full transition-colors ${
                period === key
                  ? "bg-(--color-accent-soft) text-(--color-accent-text)"
                  : "text-(--color-text-muted) hover:text-(--color-text)"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Card className="flex items-center justify-center p-12 text-sm text-(--color-text-muted) gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-(--color-accent)" /> Comparing branch performance...
        </Card>
      ) : !branches || branches.length === 0 ? (
        <Card className="text-center py-10">
          <Building2 size={32} className="mx-auto text-(--color-text-faint) mb-2" />
          <p className="text-sm font-semibold text-(--color-text)">Single Branch Configured</p>
          <p className="text-xs text-(--color-text-faint) mt-1 max-w-sm mx-auto">
            You currently have 1 primary branch configured. Add more locations in Settings &gt; Gym &amp; Branches to enable multi-branch comparison analytics.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((b: any, idx: number) => (
              <Card key={b.branchId || idx} sweep={idx === 0} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-(--color-accent)" />
                    <p className="text-sm font-semibold text-(--color-text)">{b.branchName || b.name || `Branch #${idx + 1}`}</p>
                  </div>
                  {idx === 0 && <Badge tone="good">Top Performer</Badge>}
                </div>

                <div className="p-3 rounded-xl bg-(--color-surface-2) space-y-1">
                  <p className="text-[11px] uppercase tracking-wider text-(--color-text-faint)">
                    {metric.toUpperCase()}
                  </p>
                  <p className="font-display text-2xl font-bold text-(--color-text)">
                    {metric === "revenue"
                      ? `₹${Number(b.metricValue || b.revenue || 0).toLocaleString("en-IN")}`
                      : metric === "attendance"
                      ? `${b.metricValue || b.attendanceRate || 0}%`
                      : metric === "churn"
                      ? `${b.metricValue || b.churnRate || 0}%`
                      : (b.metricValue || b.totalMembers || 0)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-(--color-text-muted)">
                  <div className="p-2 rounded-lg bg-(--color-surface-3)">
                    <span className="text-(--color-text-faint) block text-[10px]">Active Members</span>
                    <span className="font-medium text-(--color-text)">{b.activeMembers ?? b.totalMembers ?? "—"}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-(--color-surface-3)">
                    <span className="text-(--color-text-faint) block text-[10px]">Attendance</span>
                    <span className="font-medium text-(--color-text)">{b.attendanceRate ? `${b.attendanceRate}%` : "—"}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
