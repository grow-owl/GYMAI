import { useState, useEffect } from "react";
import { Dumbbell, Salad, Droplets, ChevronRight, Play, Plus, Minus } from "lucide-react";
import Card from "@/components/ui/Card";
import { workoutApi, dietApi } from "@/lib/endpoints";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface WorkoutDietProps {
  memberId?: string;
}

export default function WorkoutDietOverview({ memberId }: WorkoutDietProps) {
  const [activePlan, setActivePlan] = useState<any | null>(null);
  const [dietPlan, setDietPlan] = useState<any | null>(null);

  const dateKey = new Date().toISOString().slice(0, 10);
  const storageKey = memberId ? `gymai_water_${memberId}_${dateKey}` : `gymai_water_${dateKey}`;
  const [waterGlasses, setWaterGlasses] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved !== null ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    Promise.all([
      memberId ? workoutApi.getActivePlan(memberId).catch(() => null) : null,
      memberId ? dietApi.getActive(memberId).catch(() => null) : null,
    ])
      .then(([wRes, dRes]) => {
        if (wRes && (wRes.plan || wRes._id)) {
          setActivePlan(wRes.plan || wRes);
        }
        if (dRes && (dRes.plan || dRes._id || dRes.dietPlan)) {
          setDietPlan(dRes.plan || dRes.dietPlan || dRes);
        }
      })
      .catch(() => {});
  }, [memberId]);

  const handleWaterAdd = (delta: number) => {
    const next = Math.max(0, Math.min(12, waterGlasses + delta));
    setWaterGlasses(next);
    try {
      localStorage.setItem(storageKey, String(next));
    } catch {}
    if (delta > 0) {
      toast.success(`Hydration updated! ${next}/8 glasses completed 💧`);
    }
  };

  const exercises = activePlan?.exercises || [];
  const hasDietPlan = !!(dietPlan && (dietPlan.name || dietPlan.title || dietPlan.dailyCalorieTarget || dietPlan.targetCalories));
  const dietTitle = hasDietPlan ? (dietPlan.name || dietPlan.title || "Assigned Diet Plan") : "No Active Diet Plan";
  const caloriesDisplay = hasDietPlan
    ? `${dietPlan.dailyCalorieTarget || dietPlan.targetCalories || dietPlan.totalCalories || "--"} kcal`
    : "-- kcal";
  const proteinDisplay = hasDietPlan
    ? `${dietPlan.dailyProteinTarget_g || dietPlan.proteinGrams || dietPlan.protein || "--"}g`
    : "-- g";

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
      {/* Left: Active Workout Routine */}
      <Card className="md:col-span-7 relative overflow-hidden border border-(--color-border) bg-(--color-surface) p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-base font-extrabold text-(--color-text) truncate">
                Today's Workout Plan
              </h3>
              <p className="text-xs text-(--color-text-muted) truncate">
                {activePlan?.title || activePlan?.name || "Legs Routine"}
              </p>
            </div>
          </div>

          <Link
            to="/member/workout-plan"
            className="text-xs font-bold text-(--color-accent) hover:underline flex items-center gap-0.5 shrink-0"
          >
            All Plans <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Exercises list */}
        {exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 px-4 space-y-3 bg-(--color-surface-2)/30 rounded-xl border border-dashed border-(--color-border-soft)">
            <p className="text-sm font-semibold text-(--color-text-muted)">No active workout plan assigned.</p>
            <Link
              to="/member/workout-plan"
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white font-bold text-xs py-2.5 px-6 hover:bg-indigo-500 transition-all shadow-md"
            >
              <Dumbbell className="h-4 w-4" /> Browse & Select a Routine
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {exercises.slice(0, 4).map((ex: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-(--color-surface-2)/40 border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white font-mono">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-display text-xs font-bold text-(--color-text)">{ex.name || ex.exerciseId?.name}</p>
                    <p className="text-[11px] text-(--color-text-muted)">{ex.target || "Target Area"}</p>
                  </div>
                </div>

                <span className="text-xs font-semibold text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                  {ex.sets || 4} Sets × {ex.reps || "10-12"}
                </span>
              </div>
            ))}
          </div>
        )}

        {exercises.length > 0 && (
          <Link
            to="/member/workout-plan?tab=tracking"
            className="flex items-center justify-center gap-2 rounded-xl bg-(--color-accent) text-white font-bold text-base py-3.5 hover:brightness-110 transition-all shadow-lg mt-2"
          >
            <Play className="h-5 w-5 fill-white" /> Start Workout Logging
          </Link>
        )}
      </Card>

      {/* Right: Diet Plan & Water Tracker */}
      <Card className="md:col-span-5 relative overflow-hidden border border-(--color-border) bg-(--color-surface) p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <Salad className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-(--color-text)">
                Diet & Nutrition
              </h3>
              <p className="text-xs text-(--color-text-muted)">
                {dietTitle}
              </p>
            </div>
          </div>

          <Link
            to="/member/diet-plan"
            className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-0.5"
          >
            Diet Plan <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Macro Calories Cards */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-(--color-surface-2) border border-(--color-border)">
            <span className="text-[10px] text-(--color-text-muted) uppercase font-extrabold tracking-wider">Daily Calories</span>
            <p className="text-base font-extrabold text-(--color-text) mt-0.5">{caloriesDisplay}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-(--color-surface-2) border border-(--color-border)">
            <span className="text-[10px] text-(--color-text-muted) uppercase font-extrabold tracking-wider">Protein Goal</span>
            <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{proteinDisplay}</p>
          </div>
        </div>

        {/* Water Hydration Tracker */}
        <div className="p-3.5 rounded-2xl bg-cyan-500/10 dark:bg-cyan-950/40 border border-cyan-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-900 dark:text-cyan-200 flex items-center gap-1.5">
              <Droplets className="h-4 w-4 text-cyan-600 dark:text-cyan-400" /> Water Hydration Log
            </span>
            <span className="text-xs font-mono font-bold text-cyan-800 dark:text-cyan-300">
              {waterGlasses} / 8 Glasses
            </span>
          </div>

          {/* Water Cup Visualizer */}
          <div className="flex justify-between items-center py-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <span
                key={i}
                className={`text-base transition-all transform ${
                  i < waterGlasses ? "scale-110 opacity-100" : "opacity-30 grayscale"
                }`}
              >
                💧
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-extrabold text-cyan-900 dark:text-cyan-200">
              {(waterGlasses * 0.375).toFixed(2)} / 3.00 Liters
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleWaterAdd(-1)}
                className="h-7 w-7 rounded-lg bg-(--color-surface-2) text-(--color-text) flex items-center justify-center text-xs font-bold hover:bg-(--color-surface-3) border border-(--color-border)"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleWaterAdd(1)}
                className="h-7 w-7 rounded-lg bg-cyan-600 dark:bg-cyan-500 text-white flex items-center justify-center text-xs font-bold hover:bg-cyan-500 shadow-md"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
