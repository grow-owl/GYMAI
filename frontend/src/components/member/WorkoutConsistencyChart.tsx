import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar,
  Loader2,
  AlertCircle,
  Flame,
} from "lucide-react";
import { workoutApi } from "@/lib/endpoints";
import clsx from "clsx";

interface ChartPoint {
  date: string;
  completionPercentage: number;
}

interface WorkoutConsistencyChartProps {
  memberId?: string;
}

export default function WorkoutConsistencyChart({ memberId }: WorkoutConsistencyChartProps) {
  const [days, setDays] = useState<7 | 14 | 30>(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataPoints, setDataPoints] = useState<ChartPoint[]>([]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await workoutApi.getProgressAnalytics(days, memberId);
      const rawData = res?.data ?? (res as any)?.data?.data ?? [];
      setDataPoints(Array.isArray(rawData) ? rawData : []);
    } catch (err: any) {
      console.error("Failed to fetch workout consistency analytics:", err);
      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Unable to load consistency analytics from server."
      );
    } finally {
      setLoading(false);
    }
  }, [days, memberId]);

  useEffect(() => {
    fetchAnalytics();

    const handleWorkoutUpdated = () => {
      fetchAnalytics();
    };

    window.addEventListener("gymai:workout-updated", handleWorkoutUpdated);
    return () => {
      window.removeEventListener("gymai:workout-updated", handleWorkoutUpdated);
    };
  }, [fetchAnalytics]);

  // Derived metrics
  const stats = useMemo(() => {
    if (dataPoints.length === 0) {
      return { avgPct: 0, activeDays: 0, perfectDays: 0 };
    }
    const totalPct = dataPoints.reduce((sum, p) => sum + (p.completionPercentage || 0), 0);
    const activeDays = dataPoints.filter((p) => p.completionPercentage > 0).length;
    const perfectDays = dataPoints.filter((p) => p.completionPercentage === 100).length;
    const avgPct = Math.round(totalPct / dataPoints.length);

    return { avgPct, activeDays, perfectDays };
  }, [dataPoints]);

  // Format short date (e.g., "Mon 1" or "01 Sep")
  const formatTickDate = (isoString: string) => {
    try {
      const [year, month, day] = isoString.split("-").map(Number);
      const d = new Date(Date.UTC(year, month - 1, day));
      return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", timeZone: "UTC" });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Range Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-(--color-border-soft)">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-(--color-accent-soft) flex items-center justify-center text-(--color-accent-text)">
              <Flame className="h-4 w-4" />
            </div>
            <h4 className="font-display text-sm sm:text-base font-extrabold text-(--color-text)">
              Workout Completion & Consistency
            </h4>
          </div>
          <p className="text-xs text-(--color-text-muted) mt-0.5">
            Daily percentage of assigned workout exercises completed
          </p>
        </div>

        {/* Day Range Filter Buttons */}
        <div className="flex items-center gap-1 bg-(--color-surface-2) p-1 rounded-xl border border-(--color-border) self-start sm:self-auto">
          {([7, 14, 30] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={clsx(
                "px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                days === d
                  ? "bg-(--color-surface) text-(--color-text) shadow-sm border border-(--color-border-soft)"
                  : "text-(--color-text-muted) hover:text-(--color-text)"
              )}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="p-3 rounded-xl bg-(--color-surface-2) border border-(--color-border)">
          <span className="text-[10px] sm:text-[11px] font-bold text-(--color-text-muted) uppercase tracking-wider block truncate">
            Avg Consistency
          </span>
          <p className="font-mono text-base sm:text-xl font-extrabold text-(--color-text) mt-0.5">
            {stats.avgPct}%
          </p>
        </div>

        <div className="p-3 rounded-xl bg-(--color-surface-2) border border-(--color-border)">
          <span className="text-[10px] sm:text-[11px] font-bold text-(--color-text-muted) uppercase tracking-wider block truncate">
            Active Days
          </span>
          <p className="font-mono text-base sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {stats.activeDays} <span className="text-xs font-medium text-(--color-text-muted)">/ {days}</span>
          </p>
        </div>

        <div className="p-3 rounded-xl bg-(--color-surface-2) border border-(--color-border)">
          <span className="text-[10px] sm:text-[11px] font-bold text-(--color-text-muted) uppercase tracking-wider block truncate">
            100% Workouts
          </span>
          <p className="font-mono text-base sm:text-xl font-extrabold text-(--color-accent-text) mt-0.5">
            {stats.perfectDays} <span className="text-xs font-medium text-(--color-text-muted)">days</span>
          </p>
        </div>
      </div>

      {/* Chart View */}
      {loading ? (
        <div className="h-56 flex flex-col items-center justify-center text-(--color-text-muted) gap-2 bg-(--color-surface-2)/40 rounded-xl border border-dashed border-(--color-border)">
          <Loader2 className="h-6 w-6 animate-spin text-(--color-accent)" />
          <p className="text-xs font-semibold">Loading consistency data...</p>
        </div>
      ) : error ? (
        <div className="h-56 flex flex-col items-center justify-center text-center p-4 bg-(--color-surface-2)/40 rounded-xl border border-dashed border-(--color-border)">
          <AlertCircle className="h-8 w-8 text-amber-500 mb-1" />
          <p className="text-xs font-bold text-(--color-text)">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-2 text-xs font-bold text-(--color-accent) hover:underline"
          >
            Try Again
          </button>
        </div>
      ) : dataPoints.length === 0 ? (
        <div className="h-56 flex flex-col items-center justify-center text-center p-4 bg-(--color-surface-2)/40 rounded-xl border border-dashed border-(--color-border)">
          <Calendar className="h-8 w-8 text-(--color-text-faint) mb-1" />
          <p className="text-xs font-bold text-(--color-text)">No workout logs in this period</p>
          <p className="text-[11px] text-(--color-text-muted) mt-0.5">Complete your scheduled workouts to view your consistency score.</p>
        </div>
      ) : (
        <div className="bg-(--color-surface-2)/30 rounded-xl p-3 sm:p-4 border border-(--color-border-soft) overflow-x-auto">
          {/* Responsive SVG Bar Chart */}
          <div className="min-w-[320px] w-full">
            <div className="h-48 flex items-end gap-1.5 sm:gap-2 pt-6 pb-2 border-b border-(--color-border)">
              {dataPoints.map((point, idx) => {
                const pct = Math.min(100, Math.max(0, point.completionPercentage || 0));
                const isPerfect = pct === 100;
                const isZero = pct === 0;

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative"
                  >
                    {/* Tooltip on hover/touch */}
                    <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-(--color-navbar) text-(--color-navbar-text) text-[10px] font-bold px-2 py-0.5 rounded shadow-lg pointer-events-none whitespace-nowrap z-20">
                      {formatTickDate(point.date)}: {pct}%
                    </div>

                    {/* Percentage Label on top of bar if height permits */}
                    <span
                      className={clsx(
                        "text-[10px] font-mono font-bold mb-1 transition-colors",
                        isZero
                          ? "text-(--color-text-faint)"
                          : isPerfect
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-(--color-accent-text)"
                      )}
                    >
                      {pct > 0 ? `${pct}%` : "—"}
                    </span>

                    {/* The Bar */}
                    <div className="w-full max-w-[36px] bg-(--color-surface-3) rounded-t-md h-full flex items-end overflow-hidden">
                      <div
                        style={{ height: `${isZero ? 4 : pct}%` }}
                        className={clsx(
                          "w-full rounded-t-md transition-all duration-500",
                          isZero
                            ? "bg-(--color-border)"
                            : isPerfect
                            ? "bg-emerald-500 shadow-xs shadow-emerald-500/20"
                            : "bg-(--color-accent)"
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-Axis Date Labels */}
            <div className="flex items-center justify-between gap-1 mt-2 text-[10px] font-semibold text-(--color-text-muted)">
              {dataPoints.map((point, idx) => {
                // If 14 or 30 days, skip some labels for mobile readability
                const showLabel =
                  days === 7 ||
                  (days === 14 && idx % 2 === 0) ||
                  (days === 30 && idx % 5 === 0) ||
                  idx === dataPoints.length - 1;

                return (
                  <div key={idx} className="flex-1 text-center truncate">
                    {showLabel ? (
                      <span className="block truncate">{formatTickDate(point.date)}</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-3 border-t border-(--color-border-soft) text-[11px] text-(--color-text-muted)">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
              <span className="font-medium">100% Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm bg-(--color-accent)" />
              <span className="font-medium">Partial Workout (1–99%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm bg-(--color-border)" />
              <span className="font-medium">Rest / Missed (0%)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
