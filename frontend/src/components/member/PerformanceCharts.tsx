import { useState, useMemo } from "react";
import { TrendingDown, Scale, Calendar, Plus, Activity, Dumbbell } from "lucide-react";
import Card from "@/components/ui/Card";

interface WeightLogItem {
  _id?: string;
  weightKg: number;
  notes?: string;
  createdAt: string;
}

interface PerformanceChartsProps {
  weightLogs?: WeightLogItem[];
  targetWeightKg?: number;
  onLogWeightClick: () => void;
  isLoading?: boolean;
}

export default function PerformanceCharts({
  weightLogs = [],
  targetWeightKg = 72,
  onLogWeightClick,
  isLoading = false,
}: PerformanceChartsProps) {
  const [activeTab, setActiveTab] = useState<"weight" | "volume" | "attendance">("weight");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  // Fallback mock history if weightLogs is empty
  const displayLogs = useMemo(() => {
    if (weightLogs && weightLogs.length > 0) {
      return [...weightLogs].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }
    // Generate realistic default mock progress over last 30 days
    const now = new Date();
    const mock = [];
    const baseWeight = 82.5;
    for (let i = 25; i >= 0; i -= 4) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const randomVar = (25 - i) * 0.2 + (Math.sin(i) * 0.3);
      mock.push({
        weightKg: Number((baseWeight - randomVar).toFixed(1)),
        createdAt: d.toISOString(),
      });
    }
    return mock;
  }, [weightLogs]);

  // Calculations for stats summary
  const latestWeight = displayLogs.length > 0 ? displayLogs[displayLogs.length - 1].weightKg : 78;
  const initialWeight = displayLogs.length > 0 ? displayLogs[0].weightKg : 82.5;
  const totalChange = Number((latestWeight - initialWeight).toFixed(1));
  const diffToTarget = Number((latestWeight - targetWeightKg).toFixed(1));

  // Compute SVG coordinates for Weight Chart
  const svgChartData = useMemo(() => {
    if (displayLogs.length === 0) return { pathString: "", areaString: "", points: [] };

    const width = 600;
    const height = 200;
    const padding = 35;

    const weights = displayLogs.map((d) => d.weightKg);
    const minW = Math.min(...weights, targetWeightKg) - 1;
    const maxW = Math.max(...weights, targetWeightKg) + 1;

    const points = displayLogs.map((d, idx) => {
      const x = padding + (idx / Math.max(1, displayLogs.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((d.weightKg - minW) / (maxW - minW || 1)) * (height - 2 * padding);
      const dateLabel = new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return { x, y, weight: d.weightKg, label: dateLabel };
    });

    // Build SVG path
    let pathString = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cx = (prev.x + curr.x) / 2;
      pathString += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const areaString = `${pathString} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    const targetY = height - padding - ((targetWeightKg - minW) / (maxW - minW || 1)) * (height - 2 * padding);

    return { pathString, areaString, points, targetY, minW, maxW };
  }, [displayLogs, targetWeightKg]);

  // Mock data for Workout Volume & Attendance
  const volumeData = [
    { day: "Mon", volume: 4200, label: "Legs & Core" },
    { day: "Tue", volume: 3800, label: "Chest & Triceps" },
    { day: "Wed", volume: 0, label: "Rest Day" },
    { day: "Thu", volume: 5100, label: "Back & Biceps" },
    { day: "Fri", volume: 4600, label: "Shoulders & Abs" },
    { day: "Sat", volume: 6200, label: "Full Body Hit" },
    { day: "Sun", volume: 0, label: "Active Recovery" },
  ];

  return (
    <Card className="relative overflow-hidden border border-(--color-border) bg-(--color-surface) p-5 shadow-xl">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-(--color-accent)" />
            <h3 className="font-display text-lg font-bold text-(--color-text)">
              Performance & Metrics Analytics
            </h3>
          </div>
          <p className="text-xs text-(--color-text-muted) mt-0.5">
            Track weight progression, workout volume, and gym consistency
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 bg-(--color-surface-2) p-1 rounded-xl border border-white/5 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("weight")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "weight"
                ? "bg-(--color-accent) text-white shadow-md"
                : "text-(--color-text-muted) hover:text-(--color-text)"
            }`}
          >
            <Scale className="h-3.5 w-3.5" /> Weight Log
          </button>

          <button
            onClick={() => setActiveTab("volume")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "volume"
                ? "bg-(--color-accent) text-white shadow-md"
                : "text-(--color-text-muted) hover:text-(--color-text)"
            }`}
          >
            <Dumbbell className="h-3.5 w-3.5" /> Workout Volume
          </button>

          <button
            onClick={() => setActiveTab("attendance")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "attendance"
                ? "bg-(--color-accent) text-white shadow-md"
                : "text-(--color-text-muted) hover:text-(--color-text)"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" /> Check-ins
          </button>
        </div>
      </div>

      {/* Weight Progress View */}
      {activeTab === "weight" && (
        <div className="space-y-4">
          {/* Key Weight Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-(--color-surface-2)/60 border border-white/5">
              <span className="text-[11px] text-(--color-text-muted) font-medium uppercase tracking-wider">Current Weight</span>
              <p className="text-xl font-extrabold text-(--color-text) mt-0.5">{latestWeight} <span className="text-xs font-normal text-(--color-text-muted)">kg</span></p>
            </div>

            <div className="p-3 rounded-xl bg-(--color-surface-2)/60 border border-white/5">
              <span className="text-[11px] text-(--color-text-muted) font-medium uppercase tracking-wider">Target Goal</span>
              <p className="text-xl font-extrabold text-emerald-400 mt-0.5">{targetWeightKg} <span className="text-xs font-normal text-(--color-text-muted)">kg</span></p>
            </div>

            <div className="p-3 rounded-xl bg-(--color-surface-2)/60 border border-white/5">
              <span className="text-[11px] text-(--color-text-muted) font-medium uppercase tracking-wider">Total Progress</span>
              <p className={`text-xl font-extrabold mt-0.5 flex items-center gap-1 ${totalChange <= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                <TrendingDown className="h-4 w-4" />
                {totalChange > 0 ? `+${totalChange}` : totalChange} <span className="text-xs font-normal">kg</span>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-(--color-surface-2)/60 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-(--color-text-muted) font-medium uppercase tracking-wider">Remaining</span>
                <p className="text-xl font-extrabold text-(--color-accent) mt-0.5">{Math.abs(diffToTarget)} <span className="text-xs font-normal text-(--color-text-muted)">kg</span></p>
              </div>
              <button
                onClick={onLogWeightClick}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-(--color-accent) text-white text-xs font-bold shadow-md hover:brightness-110 transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Log
              </button>
            </div>
          </div>

          {/* SVG Interactive Line Chart */}
          <div className="relative w-full rounded-2xl bg-(--color-surface-2)/30 p-4 border border-white/5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-(--color-text-muted)">Weight Curve (kg)</span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Target Line ({targetWeightKg}kg)
                </span>
                <span className="flex items-center gap-1 text-[11px] text-(--color-accent)">
                  <span className="h-2 w-2 rounded-full bg-(--color-accent)" /> Logged History
                </span>
              </div>
            </div>

            <svg viewBox="0 0 600 200" className="w-full h-48 overflow-visible">
              <defs>
                <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent, #6366f1)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--color-accent, #6366f1)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines */}
              <line x1="35" y1="40" x2="565" y2="40" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
              <line x1="35" y1="100" x2="565" y2="100" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
              <line x1="35" y1="160" x2="565" y2="160" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />

              {/* Target Weight Reference Line */}
              {svgChartData.targetY && (
                <line
                  x1="35"
                  y1={svgChartData.targetY}
                  x2="565"
                  y2={svgChartData.targetY}
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                />
              )}

              {/* Area Fill */}
              {svgChartData.areaString && (
                <path d={svgChartData.areaString} fill="url(#weightAreaGrad)" />
              )}

              {/* Line Curve */}
              {svgChartData.pathString && (
                <path
                  d={svgChartData.pathString}
                  fill="none"
                  stroke="var(--color-accent, #6366f1)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              )}

              {/* Data Points & Tooltip Dots */}
              {svgChartData.points.map((pt, idx) => (
                <g key={idx} className="group cursor-pointer">
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="5"
                    fill="var(--color-accent, #6366f1)"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="transition-all duration-200 group-hover:r-7"
                  />
                  {/* Point Label */}
                  <text
                    x={pt.x}
                    y={pt.y - 12}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="bold"
                    className="opacity-80 group-hover:opacity-100"
                  >
                    {pt.weight}kg
                  </text>
                  <text
                    x={pt.x}
                    y="190"
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.4)"
                    fontSize="9"
                  >
                    {pt.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      )}

      {/* Workout Volume Tab */}
      {activeTab === "volume" && (
        <div className="space-y-4">
          <p className="text-xs text-(--color-text-muted)">Daily estimated weight lifted (kg) over current week</p>
          <div className="grid grid-cols-7 gap-2 h-44 items-end pt-6 pb-2 px-2 bg-(--color-surface-2)/30 rounded-2xl border border-white/5">
            {volumeData.map((item, idx) => {
              const maxVol = 7000;
              const heightPct = Math.round((item.volume / maxVol) * 100);
              return (
                <div key={idx} className="flex flex-col items-center h-full justify-end group">
                  <span className="text-[10px] text-white/70 font-mono mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.volume > 0 ? `${(item.volume/1000).toFixed(1)}k` : "Rest"}
                  </span>
                  <div className="w-full max-w-[32px] bg-white/10 rounded-t-lg overflow-hidden flex flex-col justify-end h-full">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        item.volume > 0
                          ? "bg-gradient-to-t from-indigo-600 to-accent shadow-lg"
                          : "bg-white/5"
                      }`}
                      style={{ height: `${Math.max(8, heightPct)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-(--color-text) mt-2">{item.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Attendance Check-ins Tab */}
      {activeTab === "attendance" && (
        <div className="space-y-4">
          <p className="text-xs text-(--color-text-muted)">Your monthly check-in frequency and attendance heat status</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-(--color-surface-2)/60 border border-white/5 text-center">
              <span className="text-xs text-(--color-text-muted)">Check-ins This Month</span>
              <p className="text-3xl font-extrabold text-(--color-text) mt-1">18 Days</p>
              <span className="text-[11px] text-emerald-400 font-semibold">+4 vs last month</span>
            </div>
            <div className="p-4 rounded-xl bg-(--color-surface-2)/60 border border-white/5 text-center">
              <span className="text-xs text-(--color-text-muted)">Avg Session Length</span>
              <p className="text-3xl font-extrabold text-(--color-text) mt-1">64 Mins</p>
              <span className="text-[11px] text-indigo-400 font-semibold">Optimal hypertrophy</span>
            </div>
            <div className="p-4 rounded-xl bg-(--color-surface-2)/60 border border-white/5 text-center">
              <span className="text-xs text-(--color-text-muted)">Favorite Gym Time</span>
              <p className="text-3xl font-extrabold text-(--color-text) mt-1">07:30 AM</p>
              <span className="text-[11px] text-amber-400 font-semibold">Morning Warrior</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
