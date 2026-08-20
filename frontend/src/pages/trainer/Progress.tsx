import { useState, useEffect } from "react";
import { Loader2, RefreshCw, Users, Dumbbell } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import { trainerApi, progressApi, workoutApi } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";

interface ClientProgressItem {
  id: string;
  name: string;
  planTitle: string;
  latestWeight: number | null;
  weightChange: string;
  completionRatePercent: number;
  totalWorkoutSessions: number;
  weightHistory: Array<{ label: string; value: number }>;
}

function SparklineChart({ data }: { data: Array<{ label: string; value: number }> }) {
  if (!data || data.length === 0) return null;

  const width = 140;
  const height = 32;
  const padX = 6;
  const padY = 6;

  const values = data.map((d) => d.value);
  const min = Math.min(...values) - 0.5;
  const max = Math.max(...values) + 0.5;
  const range = Math.max(0.1, max - min);

  if (data.length === 1) {
    const y = padY + ((max - data[0].value) * (height - padY * 2)) / range;
    return (
      <div className="hidden sm:flex flex-col items-center shrink-0">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-24 h-7 shrink-0 overflow-visible">
          <circle cx={width / 2} cy={y} r="3.5" fill="var(--color-accent)" />
          <text x={width / 2} y={y - 5} fontSize="9" textAnchor="middle" fill="var(--color-text)" fontWeight="bold">
            {data[0].value} kg
          </text>
        </svg>
      </div>
    );
  }

  const points = data.map((d, i) => {
    const x = padX + (i * (width - padX * 2)) / (data.length - 1);
    const y = padY + ((max - d.value) * (height - padY * 2)) / range;
    return { x, y, value: d.value };
  });

  const pathStr = points.reduce((acc, pt, idx) => {
    if (idx === 0) return `M ${pt.x} ${pt.y}`;
    const prev = points[idx - 1];
    const cx = (prev.x + pt.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
  }, "");

  const lastPt = points[points.length - 1];
  const firstPt = points[0];

  return (
    <div className="hidden sm:flex flex-col items-end shrink-0">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-24 h-7 shrink-0 overflow-visible">
        <path d={pathStr} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" />
        <circle cx={firstPt.x} cy={firstPt.y} r="2" fill="var(--color-text-muted)" />
        <circle cx={lastPt.x} cy={lastPt.y} r="3" fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth="1.5" />
      </svg>
      <span className="text-[9px] font-semibold text-(--color-text-faint)">Weight Sparkline</span>
    </div>
  );
}

export default function Progress() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientProgress, setClientProgress] = useState<ClientProgressItem[]>([]);

  const fetchProgress = async () => {
    if (!user?.gymId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const clientsRes = await trainerApi.getMyClients(user.gymId);
      const clientsList = Array.isArray(clientsRes) ? clientsRes : clientsRes?.clients || [];

      if (clientsList.length === 0) {
        setClientProgress([]);
        setLoading(false);
        return;
      }

      const items: ClientProgressItem[] = await Promise.all(
        clientsList.map(async (c: any) => {
          const cId = c._id || c.id;
          const name = c.fullName || c.name || c.userId?.fullName || "Member";

          let latestWeight: number | null = null;
          let weightChange = "No weight logs yet";
          let planTitle = "No active plan";
          let completionRatePercent = 0;
          let totalWorkoutSessions = 0;
          let weightHistory: Array<{ label: string; value: number }> = [];

          if (cId) {
            const [histRes, planRes, statsRes] = await Promise.all([
              progressApi.getHistory(cId).catch(() => null),
              workoutApi.getActivePlan(cId).catch(() => null),
              workoutApi.getCompletionStats(cId).catch(() => null),
            ]);

            const history = histRes?.history || (Array.isArray(histRes) ? histRes : []);
            if (Array.isArray(history) && history.length > 0) {
              const sorted = [...history].sort(
                (a, b) => new Date(a.createdAt || a.recordedAt).getTime() - new Date(b.createdAt || b.recordedAt).getTime()
              );
              const first = sorted[0].weightKg;
              const last = sorted[sorted.length - 1].weightKg;
              latestWeight = last;
              const diff = Number((last - first).toFixed(1));
              if (history.length === 1) {
                weightChange = `Initial log: ${last} kg`;
              } else {
                weightChange = `${diff >= 0 ? "+" : ""}${diff} kg (${history.length} logs)`;
              }
              weightHistory = sorted.map((item) => ({
                label: new Date(item.createdAt || item.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                value: Number(item.weightKg),
              }));
            }

            if (planRes && (planRes.plan || planRes.title || planRes.name)) {
              const p = planRes.plan || planRes;
              planTitle = p.title || p.name || "Active Workout Plan";
            }

            if (statsRes) {
              const stats = statsRes?.stats || statsRes;
              completionRatePercent = stats?.completionRatePercent ?? 0;
              totalWorkoutSessions = stats?.totalWorkoutSessions ?? 0;
            }
          }

          return {
            id: String(cId || name),
            name,
            planTitle,
            latestWeight,
            weightChange,
            completionRatePercent,
            totalWorkoutSessions,
            weightHistory,
          };
        })
      );

      setClientProgress(items);
    } catch {
      setError("Failed to load client progress records from backend.");
      setClientProgress([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [user]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Client Progress"
        subtitle="Strength & body composition trends across assigned clients"
        backTo="/trainer"
        action={
          <button
            onClick={fetchProgress}
            className="inline-flex items-center gap-1.5 p-2 rounded-lg bg-(--color-surface-2) text-xs text-(--color-text-muted) hover:text-(--color-text) border border-(--color-border)"
            title="Refresh Progress"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-(--color-accent)" : ""} /> Refresh
          </button>
        }
      />

      {loading ? (
        <Card className="flex items-center justify-center p-12 text-sm text-(--color-text-muted) gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-(--color-accent)" /> Loading client progress records...
        </Card>
      ) : error ? (
        <Card className="text-center py-8">
          <p className="text-sm text-(--color-danger) mb-3">{error}</p>
          <button
            onClick={fetchProgress}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-full bg-(--color-surface-3) text-(--color-text)"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </Card>
      ) : clientProgress.length === 0 ? (
        <Card className="text-center py-12 text-(--color-text-muted) space-y-2">
          <Users className="w-8 h-8 mx-auto text-(--color-text-faint)" />
          <p className="text-sm font-medium text-(--color-text)">No client progress records found</p>
          <p className="text-xs text-(--color-text-muted)">
            As your assigned clients log weights and workouts, their progress trends will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {clientProgress.map((p) => (
            <Card key={p.id} className="p-4.5 space-y-3 border border-(--color-border) bg-(--color-surface)">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-(--color-accent)/15 text-(--color-accent) font-bold text-sm flex items-center justify-center border border-(--color-accent)/30 shrink-0 uppercase">
                    {p.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-(--color-text)">{p.name}</p>
                    <p className="text-xs text-(--color-text-muted) mt-0.5 flex items-center gap-1">
                      <Dumbbell size={13} className="text-(--color-accent) shrink-0" />
                      {p.planTitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 text-right">
                  <SparklineChart data={p.weightHistory} />
                  <div>
                    {p.latestWeight !== null ? (
                      <p className="text-sm font-extrabold text-(--color-text)">
                        {p.latestWeight} <span className="text-xs font-normal text-(--color-text-muted)">kg</span>
                      </p>
                    ) : (
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-(--color-surface-2) text-(--color-text-muted) border border-(--color-border)">
                        No weigh-in
                      </span>
                    )}
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">{p.weightChange}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] font-semibold text-(--color-text-muted)">
                  <span>Workout Completion Rate ({p.totalWorkoutSessions} sessions logged)</span>
                  <span className="font-bold text-(--color-text)">{p.completionRatePercent}%</span>
                </div>
                <ProgressBar value={p.completionRatePercent} max={100} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
