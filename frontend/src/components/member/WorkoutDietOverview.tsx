import { useState, useEffect, useCallback } from "react";
import { Salad, Droplets, ChevronRight, Plus, Minus } from "lucide-react";
import Card from "@/components/ui/Card";
import { dietApi, progressApi } from "@/lib/endpoints";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { showApiErrorToast } from "@/lib/api";
import { getLocalDateKey } from "@/lib/dateUtils";
import TodayWorkoutChecklist from "./TodayWorkoutChecklist";

interface WorkoutDietProps {
  memberId?: string;
}

export default function WorkoutDietOverview({ memberId }: WorkoutDietProps) {
  const [dietPlan, setDietPlan] = useState<any | null>(null);

  const dateKey = getLocalDateKey();
  const storageKey = memberId ? `gymai_water_${memberId}_${dateKey}` : `gymai_water_${dateKey}`;

  // Instant cached initialization from localStorage
  const [waterGlasses, setWaterGlasses] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("gymai_water_glasses");
      const savedDate = localStorage.getItem("gymai_water_glasses_date");
      if (saved !== null && savedDate === dateKey) {
        return parseInt(saved, 10);
      }
      const localByKey = localStorage.getItem(storageKey);
      return localByKey !== null ? parseInt(localByKey, 10) : 0;
    } catch {
      return 0;
    }
  });

  // Sync today's logged water from database on mount or memberId arrival
  const syncServerWellness = useCallback(async () => {
    try {
      const res: any = await progressApi.getWellnessHistory().catch(() => null);
      const historyList = Array.isArray(res) ? res : res?.history || [];
      const todayEntry = historyList.find((w: any) => w.dayKey === dateKey);

      if (todayEntry && typeof todayEntry.waterIntakeMl === "number") {
        const glasses = Math.min(12, Math.round(todayEntry.waterIntakeMl / 375));
        setWaterGlasses(glasses);
        localStorage.setItem("gymai_water_glasses", String(glasses));
        localStorage.setItem("gymai_water_glasses_date", dateKey);
        if (memberId) {
          localStorage.setItem(`gymai_water_${memberId}_${dateKey}`, String(glasses));
        }
      } else {
        // New day: No water logged yet today! Clean reset to 0.
        setWaterGlasses(0);
        localStorage.setItem("gymai_water_glasses", "0");
        localStorage.setItem("gymai_water_glasses_date", dateKey);
        localStorage.setItem("gymai_water_liters", "0.00");
        if (memberId) {
          localStorage.setItem(`gymai_water_${memberId}_${dateKey}`, "0");
        }
      }
    } catch (err) {
      console.error("Error syncing wellness history:", err);
    }
  }, [dateKey, memberId]);

  useEffect(() => {
    syncServerWellness();
  }, [syncServerWellness]);

  // Listen to external wellness updates (e.g. from Progress modal or AI Coach)
  useEffect(() => {
    const handleWellnessEvent = (e: any) => {
      const g = e?.detail?.waterGlasses;
      if (typeof g === "number") {
        setWaterGlasses(g);
      } else {
        syncServerWellness();
      }
    };
    window.addEventListener("gymai:wellness-updated", handleWellnessEvent);
    return () => {
      window.removeEventListener("gymai:wellness-updated", handleWellnessEvent);
    };
  }, [syncServerWellness]);

  useEffect(() => {
    if (memberId) {
      dietApi.getActive(memberId)
        .then((dRes) => {
          if (dRes && (dRes.dietPlan || dRes.plan)) {
            setDietPlan(dRes.dietPlan || dRes.plan || null);
          }
        })
        .catch(() => {});
    }
  }, [memberId]);

  const handleWaterAdd = (delta: number) => {
    const next = Math.max(0, Math.min(12, waterGlasses + delta));
    setWaterGlasses(next);
    
    // 1. Immediately cache in localStorage for zero-latency UI
    try {
      localStorage.setItem("gymai_water_glasses", String(next));
      localStorage.setItem("gymai_water_glasses_date", dateKey);
      localStorage.setItem(storageKey, String(next));
      localStorage.setItem("gymai_water_liters", (next * 0.375).toFixed(2));
    } catch {}

    // 2. Persist to backend database (upsert DailyWellness)
    const waterMl = Math.round(next * 375);
    progressApi.logWellness({ waterIntakeMl: waterMl, dayKey: dateKey }).catch((err) => {
      console.error("Failed to sync water intake to server:", err);
      showApiErrorToast(err, "Failed to sync hydration to server");
    });

    // 3. Dispatch real-time events for AICoach and Progress page
    window.dispatchEvent(
      new CustomEvent("gymai:wellness-updated", {
        detail: {
          waterGlasses: next,
          waterMl,
          waterLiters: (next * 0.375).toFixed(2),
          dayKey: dateKey,
        },
      })
    );
    window.dispatchEvent(new Event("gymai:workout-updated"));

    if (delta > 0) {
      toast.success(`Hydration saved! ${next}/8 glasses (${(next * 0.375).toFixed(2)}L) 💧`);
    }
  };

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
      {/* Left: Active Today's Workout Checklist */}
      <div className="md:col-span-7">
        <TodayWorkoutChecklist memberId={memberId} compact={true} />
      </div>

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
        <div className="p-4 rounded-2xl bg-white border border-(--color-border) shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
                <Droplets size={16} className="fill-sky-500/20" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-(--color-text) block leading-tight">
                  Daily Water Hydration
                </span>
                <span className="text-[10px] text-(--color-text-faint)">
                  Target: 3.0 Liters (8 Glasses)
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-display font-extrabold text-(--color-text)">
                {waterGlasses} <span className="text-[10px] font-normal text-(--color-text-faint)">/ 8 Glasses</span>
              </span>
              <span className="text-[10px] block font-mono font-bold text-sky-600">
                {(waterGlasses * 0.375).toFixed(2)} L
              </span>
            </div>
          </div>

          {/* Smooth Progress Bar */}
          <div className="h-2 w-full rounded-full bg-(--color-surface-2) border border-(--color-border-soft) overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-300 shadow-xs"
              style={{ width: `${Math.min(100, (waterGlasses / 8) * 100)}%` }}
            />
          </div>

          {/* 8 Interactive Glass Buttons */}
          <div className="grid grid-cols-8 gap-1.5 py-0.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const next = i + 1 === waterGlasses ? i : i + 1;
                  const diff = next - waterGlasses;
                  handleWaterAdd(diff);
                }}
                className={`h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer border ${
                  i < waterGlasses
                    ? "bg-sky-500 text-white border-sky-600 shadow-xs font-bold scale-102"
                    : "bg-(--color-surface-2) text-(--color-text-faint) border-(--color-border-soft) hover:border-sky-300"
                }`}
                title={`Glass ${i + 1} (${((i + 1) * 0.375).toFixed(2)}L)`}
              >
                <Droplets size={12} className={i < waterGlasses ? "fill-white" : "opacity-35"} />
              </button>
            ))}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 border-t border-(--color-border-soft) text-[11px]">
            <span className="text-(--color-text-muted) font-medium">
              {waterGlasses >= 8 ? "🎉 Daily Goal Reached!" : `${Math.max(0, 8 - waterGlasses)} glasses left to reach 3.0L`}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleWaterAdd(-1)}
                disabled={waterGlasses <= 0}
                className="h-7 px-2.5 rounded-lg bg-(--color-surface-2) text-(--color-text) hover:bg-(--color-surface-3) disabled:opacity-40 text-xs font-bold border border-(--color-border) cursor-pointer transition-colors"
                title="Remove glass"
              >
                <Minus className="h-3 w-3" />
              </button>
              <button
                onClick={() => handleWaterAdd(1)}
                disabled={waterGlasses >= 12}
                className="h-7 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors flex items-center gap-1"
                title="Add glass"
              >
                <Plus className="h-3 w-3" /> Add Glass
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
