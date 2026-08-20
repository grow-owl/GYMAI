import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Dumbbell, Plus, CheckCircle, Loader2, RefreshCw, Trophy, Sparkles, ArrowRight, Activity } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import CustomSelect from "@/components/ui/CustomSelect";
import { workoutApi, memberApi } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

interface ExerciseSet {
  exerciseName: string;
  sets: number;
  reps: number;
  weightKg: number;
}

const PRESET_ROUTINES = [
  {
    name: "Day 1: Chest & Triceps Focus 🏋️‍♂️",
    exercises: [
      { exerciseName: "Bench Press", sets: 3, reps: 10, weightKg: 60 },
      { exerciseName: "Incline Dumbbell Press", sets: 3, reps: 10, weightKg: 22 },
      { exerciseName: "Tricep Dips / Pushdowns", sets: 3, reps: 12, weightKg: 25 },
    ],
  },
  {
    name: "Day 2: Back & Biceps Power 💪",
    exercises: [
      { exerciseName: "Lat Pulldown", sets: 3, reps: 10, weightKg: 50 },
      { exerciseName: "Seated Cable Rows", sets: 3, reps: 10, weightKg: 55 },
      { exerciseName: "Bicep Dumbbell Curls", sets: 3, reps: 12, weightKg: 14 },
    ],
  },
  {
    name: "Day 3: Legs & Core Strength 🦵",
    exercises: [
      { exerciseName: "Barbell Squats", sets: 3, reps: 10, weightKg: 70 },
      { exerciseName: "Leg Press", sets: 3, reps: 12, weightKg: 120 },
      { exerciseName: "Romanian Deadlift", sets: 3, reps: 10, weightKg: 60 },
    ],
  },
  {
    name: "Day 4: Shoulders & Arms Sculpting ⚡",
    exercises: [
      { exerciseName: "Overhead Shoulder Press", sets: 3, reps: 10, weightKg: 45 },
      { exerciseName: "Dumbbell Lateral Raises", sets: 3, reps: 12, weightKg: 10 },
      { exerciseName: "Hammer Curls", sets: 3, reps: 12, weightKg: 14 },
    ],
  },
];

export default function WorkoutTracking() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exercises, setExercises] = useState<any[]>([]);

  const [routines, setRoutines] = useState(PRESET_ROUTINES);
  const [routineIndex, setRoutineIndex] = useState(0);
  const [routineName, setRoutineName] = useState(PRESET_ROUTINES[0].name);

  const [submitting, setSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loggedSets, setLoggedSets] = useState<ExerciseSet[]>(PRESET_ROUTINES[0].exercises);

  const [lastSummary, setLastSummary] = useState<{
    routineName: string;
    totalVolume: number;
    totalSets: number;
    exerciseCount: number;
    xpEarned: number;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [exListRes, profRes] = await Promise.all([
        workoutApi.listExercises().catch(() => []),
        memberApi.getSelfProfile().catch(() => null),
      ]);

      const list = Array.isArray(exListRes) ? exListRes : [];
      setExercises(list);

      const memberId = profRes?.member?._id || user?._id;
      if (memberId) {
        const planRes = await workoutApi.getActivePlan(memberId).catch(() => null);
        const plan = planRes?.plan || planRes;
        if (plan && plan.days && Array.isArray(plan.days) && plan.days.length > 0) {
          const mappedRoutines = plan.days.map((day: any, idx: number) => ({
            name: day.title || day.dayName || `Workout Day ${idx + 1}`,
            exercises: (day.exercises || []).map((ex: any) => ({
              exerciseName: ex.name || ex.exerciseName || "Exercise",
              sets: Number(ex.sets) || 3,
              reps: Number(ex.reps) || 10,
              weightKg: Number(ex.weightKg) || 20,
            })),
          }));
          if (mappedRoutines.length > 0) {
            setRoutines(mappedRoutines);
            setRoutineName(mappedRoutines[0].name);
            setLoggedSets(mappedRoutines[0].exercises.length > 0 ? mappedRoutines[0].exercises : PRESET_ROUTINES[0].exercises);
          }
        }
      }
    } catch {
      setError("Failed to load workout exercises.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleAddSetRow = () => {
    const defaultEx = exercises[0]?.name || "Bench Press";
    setLoggedSets([...loggedSets, { exerciseName: defaultEx, sets: 3, reps: 10, weightKg: 40 }]);
  };

  const handleSaveWorkout = async () => {
    if (loggedSets.length === 0) {
      toast.error("Please add at least one exercise to log.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await workoutApi.logWorkout({
        loggedAt: new Date().toISOString(),
        exercises: loggedSets,
      });

      const logId = res?._id || res?.id || res?.log?._id;
      if (logId) {
        for (const item of loggedSets) {
          const exId = item.exerciseName.toLowerCase().replace(/\s+/g, "-");
          for (let s = 1; s <= item.sets; s++) {
            await workoutApi.logSetProgress(logId, exId, s, { reps: item.reps, weightKg: item.weightKg, completed: true }).catch(() => null);
          }
          await workoutApi.markExerciseComplete(logId, exId).catch(() => null);
        }
        await workoutApi.completeWorkoutLog(logId).catch(() => null);
      }

      const totalVolume = loggedSets.reduce((sum, s) => sum + s.sets * s.reps * s.weightKg, 0);
      const totalSets = loggedSets.reduce((sum, s) => sum + s.sets, 0);

      setLastSummary({
        routineName,
        totalVolume,
        totalSets,
        exerciseCount: loggedSets.length,
        xpEarned: 100,
      });

      setIsCompleted(true);
      toast.success("Workout logged & completed successfully! +100 XP Earned 🎉");
    } catch {
      toast.error("Failed to log workout session.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartNextWorkout = () => {
    const nextIndex = (routineIndex + 1) % routines.length;
    const nextRoutine = routines[nextIndex];
    setRoutineIndex(nextIndex);
    setRoutineName(nextRoutine.name);
    setLoggedSets(nextRoutine.exercises.length > 0 ? nextRoutine.exercises : PRESET_ROUTINES[nextIndex % PRESET_ROUTINES.length].exercises);
    setIsCompleted(false);
    toast.info(`Loaded next workout: ${nextRoutine.name}`);
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto w-full">
      <PageHeader title="Workout Tracker" subtitle="Log your sets & weights" backTo="/member" />

      {loading ? (
        <Card className="flex items-center justify-center p-12 text-sm text-(--color-text-muted) gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-(--color-accent)" /> Loading workout tracker...
        </Card>
      ) : error ? (
        <Card className="text-center py-8">
          <p className="text-sm text-(--color-danger) mb-3">{error}</p>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-full bg-(--color-surface-3) text-(--color-text)"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </Card>
      ) : isCompleted ? (
        /* Celebration & Next Workout Prompt Screen */
        <Card className="p-6 text-center space-y-6 bg-gradient-to-b from-(--color-surface) to-(--color-surface-2) border border-(--color-border) shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl animate-pulse" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-amber-400 via-orange-500 to-red-500 text-white shadow-xl">
              <Trophy className="h-10 w-10 animate-bounce" />
            </div>
          </div>

          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Sparkles className="h-3.5 w-3.5" /> +100 XP EARNED
            </span>
            <h2 className="font-display text-2xl font-extrabold text-(--color-text) mt-2">
              Workout Session Complete!
            </h2>
            <p className="text-xs text-(--color-text-muted)">
              Great job! You completed <span className="font-bold text-(--color-text)">{lastSummary?.routineName}</span>
            </p>
          </div>

          {/* Session Performance Summary Card */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-(--color-surface-3) border border-(--color-border-soft) text-center">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-bold text-(--color-text-faint) truncate">Exercises</p>
              <p className="text-base font-extrabold text-(--color-text) mt-0.5 truncate">{lastSummary?.exerciseCount}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-bold text-(--color-text-faint) truncate">Total Sets</p>
              <p className="text-base font-extrabold text-(--color-text) mt-0.5 truncate">{lastSummary?.totalSets}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-bold text-(--color-text-faint) truncate">Total Volume</p>
              <p className="text-base font-extrabold text-amber-400 mt-0.5 truncate">{lastSummary?.totalVolume?.toLocaleString()} kg</p>
            </div>
          </div>

          {/* Action Buttons: Next Workout & Navigation */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleStartNextWorkout}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm py-3.5 shadow-lg transition-all cursor-pointer"
            >
              Start Next Workout Session <ArrowRight className="h-4 w-4" />
            </button>

            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/member"
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-(--color-text) border border-white/10 transition-all"
              >
                Dashboard
              </Link>
              <Link
                to="/member/progress"
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-(--color-text) border border-white/10 transition-all"
              >
                <Activity className="h-3.5 w-3.5 text-emerald-400" /> View Stats
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        /* Active Workout Logger View */
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-2.5 border-b border-(--color-border-soft) pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--color-accent)/15 text-(--color-accent)">
                <Dumbbell size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-extrabold text-(--color-text) truncate">{routineName}</p>
                <p className="text-[11px] text-(--color-text-muted) truncate">Log your sets & weights for this session</p>
              </div>
            </div>
            <button
              onClick={handleAddSetRow}
              className="inline-flex items-center gap-1 text-xs font-bold text-(--color-accent) hover:underline shrink-0 whitespace-nowrap bg-(--color-accent)/10 px-3 py-1.5 rounded-xl border border-(--color-accent)/20 cursor-pointer transition-all"
            >
              <Plus size={14} /> Add Exercise
            </button>
          </div>

          <div className="space-y-3">
            {loggedSets.map((set, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-(--color-surface-2) border border-(--color-border-soft) space-y-2">
                <div className="flex items-center justify-between">
                  {exercises.length > 0 ? (
                    <CustomSelect
                      value={set.exerciseName}
                      onChange={(v) => {
                        const updated = [...loggedSets];
                        updated[idx].exerciseName = v;
                        setLoggedSets(updated);
                      }}
                      compact
                      options={exercises.map((ex) => ({
                        value: ex.name,
                        label: `${ex.name} (${ex.category || "General"})`,
                      }))}
                    />
                  ) : (
                    <input
                      value={set.exerciseName}
                      onChange={(e) => {
                        const updated = [...loggedSets];
                        updated[idx].exerciseName = e.target.value;
                        setLoggedSets(updated);
                      }}
                      className="bg-transparent font-medium text-sm text-(--color-text) outline-none"
                    />
                  )}
                  {loggedSets.length > 1 && (
                    <button
                      onClick={() => setLoggedSets(loggedSets.filter((_, i) => i !== idx))}
                      className="text-xs text-(--color-danger) hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="min-w-0">
                    <label className="text-(--color-text-faint) block truncate">Sets</label>
                    <input
                      type="number"
                      min={1}
                      value={set.sets}
                      onChange={(e) => {
                        const updated = [...loggedSets];
                        updated[idx].sets = Math.max(1, Number(e.target.value));
                        setLoggedSets(updated);
                      }}
                      className="w-full mt-1 p-1.5 rounded-lg bg-(--color-surface) border border-(--color-border) text-center text-(--color-text)"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="text-(--color-text-faint) block truncate">Reps</label>
                    <input
                      type="number"
                      min={1}
                      value={set.reps}
                      onChange={(e) => {
                        const updated = [...loggedSets];
                        updated[idx].reps = Math.max(1, Number(e.target.value));
                        setLoggedSets(updated);
                      }}
                      className="w-full mt-1 p-1.5 rounded-lg bg-(--color-surface) border border-(--color-border) text-center text-(--color-text)"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="text-(--color-text-faint) block truncate">Weight (kg)</label>
                    <input
                      type="number"
                      min={0}
                      value={set.weightKg}
                      onChange={(e) => {
                        const updated = [...loggedSets];
                        updated[idx].weightKg = Math.max(0, Number(e.target.value));
                        setLoggedSets(updated);
                      }}
                      className="w-full mt-1 p-1.5 rounded-lg bg-(--color-surface) border border-(--color-border) text-center text-(--color-text)"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveWorkout}
            disabled={submitting}
            className="w-full mt-4 flex items-center justify-center gap-2 rounded-full bg-(--color-accent) hover:brightness-110 text-white font-bold text-sm py-3.5 shadow-lg disabled:opacity-50 transition-all cursor-pointer"
          >
            <CheckCircle size={18} /> {submitting ? "Saving Workout..." : "Log Complete Workout Session"}
          </button>
        </Card>
      )}
    </div>
  );
}

