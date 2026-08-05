import { useMemo } from "react";
import { Activity, Flame, Dumbbell, Award, RefreshCw, Info } from "lucide-react";
import Card from "@/components/ui/Card";

interface FitnessScoreProps {
  attendanceRate?: number;
  streakDays?: number;
  completedWorkoutsCount?: number;
  hasWeightLogs?: boolean;
  totalXp?: number;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export default function FitnessScoreGauge({
  attendanceRate = 85,
  streakDays = 5,
  completedWorkoutsCount = 12,
  hasWeightLogs = true,
  totalXp = 1250,
  onRefresh,
  isLoading = false,
}: FitnessScoreProps) {
  // Compute overall performance score dynamically out of 100
  const scores = useMemo(() => {
    // 1. Consistency Score (0-30 pts)
    const consistencyScore = Math.min(30, Math.round((attendanceRate / 100) * 30));
    
    // 2. Workout Score (0-25 pts)
    const workoutScore = Math.min(25, Math.round((completedWorkoutsCount / 15) * 25));
    
    // 3. Streak & Gamification Score (0-25 pts)
    const streakBonus = Math.min(15, streakDays * 3);
    const xpBonus = Math.min(10, Math.round((totalXp / 2000) * 10));
    const gamificationScore = streakBonus + xpBonus;
    
    // 4. Progress & Logging Score (0-20 pts)
    const loggingScore = hasWeightLogs ? 20 : 5;

    const totalScore = Math.min(100, consistencyScore + workoutScore + gamificationScore + loggingScore);

    let tierLabel = "Spartan Starter";
    let tierColor = "text-blue-400";
    let bgGradient = "from-blue-500 to-indigo-600";
    if (totalScore >= 85) {
      tierLabel = "Elite Champion 🏆";
      tierColor = "text-amber-400";
      bgGradient = "from-amber-400 via-orange-500 to-red-500";
    } else if (totalScore >= 70) {
      tierLabel = "Pro Athlete 💪";
      tierColor = "text-emerald-400";
      bgGradient = "from-emerald-400 to-teal-600";
    } else if (totalScore >= 50) {
      tierLabel = "Dedicated Lifter 🏋️";
      tierColor = "text-cyan-400";
      bgGradient = "from-cyan-400 to-blue-600";
    }

    return {
      totalScore,
      consistencyScore,
      workoutScore,
      gamificationScore,
      loggingScore,
      tierLabel,
      tierColor,
      bgGradient,
    };
  }, [attendanceRate, streakDays, completedWorkoutsCount, hasWeightLogs, totalXp]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scores.totalScore / 100) * circumference;

  return (
    <Card className="relative overflow-hidden border border-(--color-border) bg-(--color-surface) p-5 shadow-xl">
      {/* Background glow behind gauge */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br opacity-15 blur-3xl" />
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--color-accent)/15 text-(--color-accent)">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-(--color-text)">
              AI Performance Score
            </h3>
            <p className="text-xs text-(--color-text-muted)">
              Real-time calculated fitness rating
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1 text-xs text-(--color-text-muted) hover:text-(--color-text) transition-colors p-1.5 rounded-md hover:bg-white/5"
            title="Recalculate Score"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-(--color-accent)" : ""}`} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left: Circular Gauge */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-3 rounded-2xl bg-(--color-surface-2)/40 border border-white/5">
          <div className="relative flex items-center justify-center">
            <svg className="h-36 w-36 transform -rotate-90">
              {/* Track */}
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-white/10"
                strokeWidth="10"
                fill="transparent"
              />
              {/* Progress Circle */}
              <circle
                cx="72"
                cy="72"
                r={radius}
                stroke="url(#scoreGradient)"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="50%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="font-display text-3xl font-extrabold text-(--color-text) tracking-tight">
                {scores.totalScore}
              </span>
              <span className="text-[11px] font-semibold text-(--color-text-muted) uppercase tracking-widest">
                Out of 100
              </span>
            </div>
          </div>

          <div className="mt-3 text-center">
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-white/5 border border-white/10 ${scores.tierColor}`}>
              <Award className="h-3.5 w-3.5" />
              {scores.tierLabel}
            </span>
          </div>
        </div>

        {/* Right: Sub-score Breakdown Bars */}
        <div className="md:col-span-7 space-y-3">
          {/* Consistency */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="flex items-center gap-1 text-(--color-text-muted) font-medium">
                <Flame className="h-3.5 w-3.5 text-amber-400" /> Attendance & Consistency
              </span>
              <span className="font-bold text-(--color-text)">{scores.consistencyScore} / 30 pts</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${(scores.consistencyScore / 30) * 100}%` }}
              />
            </div>
          </div>

          {/* Workout Volume */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="flex items-center gap-1 text-(--color-text-muted) font-medium">
                <Dumbbell className="h-3.5 w-3.5 text-indigo-400" /> Workout Execution
              </span>
              <span className="font-bold text-(--color-text)">{scores.workoutScore} / 25 pts</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${(scores.workoutScore / 25) * 100}%` }}
              />
            </div>
          </div>

          {/* Gamification & Streak */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="flex items-center gap-1 text-(--color-text-muted) font-medium">
                <Award className="h-3.5 w-3.5 text-purple-400" /> Streak & Gamification XP
              </span>
              <span className="font-bold text-(--color-text)">{scores.gamificationScore} / 25 pts</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                style={{ width: `${(scores.gamificationScore / 25) * 100}%` }}
              />
            </div>
          </div>

          {/* Weight & Body Tracking */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="flex items-center gap-1 text-(--color-text-muted) font-medium">
                <Activity className="h-3.5 w-3.5 text-emerald-400" /> Metric & Weight Logging
              </span>
              <span className="font-bold text-(--color-text)">{scores.loggingScore} / 20 pts</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${(scores.loggingScore / 20) * 100}%` }}
              />
            </div>
          </div>

          <p className="text-[11px] text-(--color-text-muted) flex items-center gap-1 mt-2">
            <Info className="h-3 w-3 text-(--color-accent)" /> Check-in daily, finish workouts, and log weight to boost your score!
          </p>
        </div>
      </div>
    </Card>
  );
}
