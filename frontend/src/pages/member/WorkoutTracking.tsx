import { useState, useEffect } from "react";
import { Dumbbell, Plus, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { workoutApi } from "@/lib/endpoints";
import { toast } from "sonner";

export default function WorkoutTracking() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exercises, setExercises] = useState<any[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [loggedSets, setLoggedSets] = useState<{ exerciseName: string; sets: number; reps: number; weightKg: number }[]>([
    { exerciseName: "Bench Press", sets: 3, reps: 10, weightKg: 60 },
  ]);

  const fetchExercises = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await workoutApi.listExercises();
      const list = Array.isArray(res) ? res : [];
      setExercises(list);
    } catch {
      setError("Failed to load exercise list.");
      setExercises([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  const handleAddSetRow = () => {
    const defaultEx = exercises[0]?.name || "Squats";
    setLoggedSets([...loggedSets, { exerciseName: defaultEx, sets: 3, reps: 10, weightKg: 50 }]);
  };

  const handleSaveWorkout = async () => {
    setSubmitting(true);
    try {
      await workoutApi.logWorkout({
        loggedAt: new Date().toISOString(),
        exercises: loggedSets,
      });
      toast.success("Workout logged successfully!");
    } catch {
      toast.error("Failed to log workout session.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto w-full">
      <PageHeader title="Workout Tracker" subtitle="Log your sets & weights" backTo="/member" />

      {loading ? (
        <Card className="flex items-center justify-center p-12 text-sm text-(--color-text-muted) gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-(--color-accent)" /> Loading exercise library...
        </Card>
      ) : error ? (
        <Card className="text-center py-8">
          <p className="text-sm text-(--color-danger) mb-3">{error}</p>
          <button
            onClick={fetchExercises}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-full bg-(--color-surface-3) text-(--color-text)"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </Card>
      ) : (
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-(--color-border-soft) pb-3">
            <div className="flex items-center gap-2">
              <Dumbbell size={18} className="text-(--color-accent)" />
              <p className="text-sm font-semibold text-(--color-text)">Today's Exercises</p>
            </div>
            <button
              onClick={handleAddSetRow}
              className="inline-flex items-center gap-1 text-xs font-medium text-(--color-accent-text) hover:underline"
            >
              <Plus size={14} /> Add Exercise
            </button>
          </div>

          <div className="space-y-3">
            {loggedSets.map((set, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-(--color-surface-2) space-y-2">
                <div className="flex items-center justify-between">
                  {exercises.length > 0 ? (
                    <select
                      value={set.exerciseName}
                      onChange={(e) => {
                        const updated = [...loggedSets];
                        updated[idx].exerciseName = e.target.value;
                        setLoggedSets(updated);
                      }}
                      className="bg-transparent font-medium text-sm text-(--color-text) outline-none"
                    >
                      {exercises.map((ex) => (
                        <option key={ex._id || ex.id} value={ex.name} className="bg-(--color-surface)">
                          {ex.name} ({ex.category || "General"})
                        </option>
                      ))}
                    </select>
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
                  <button
                    onClick={() => setLoggedSets(loggedSets.filter((_, i) => i !== idx))}
                    className="text-xs text-(--color-danger) hover:underline"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <label className="text-(--color-text-faint)">Sets</label>
                    <input
                      type="number"
                      value={set.sets}
                      onChange={(e) => {
                        const updated = [...loggedSets];
                        updated[idx].sets = Number(e.target.value);
                        setLoggedSets(updated);
                      }}
                      className="w-full mt-1 p-1.5 rounded-lg bg-(--color-surface) border border-(--color-border) text-center text-(--color-text)"
                    />
                  </div>
                  <div>
                    <label className="text-(--color-text-faint)">Reps</label>
                    <input
                      type="number"
                      value={set.reps}
                      onChange={(e) => {
                        const updated = [...loggedSets];
                        updated[idx].reps = Number(e.target.value);
                        setLoggedSets(updated);
                      }}
                      className="w-full mt-1 p-1.5 rounded-lg bg-(--color-surface) border border-(--color-border) text-center text-(--color-text)"
                    />
                  </div>
                  <div>
                    <label className="text-(--color-text-faint)">Weight (kg)</label>
                    <input
                      type="number"
                      value={set.weightKg}
                      onChange={(e) => {
                        const updated = [...loggedSets];
                        updated[idx].weightKg = Number(e.target.value);
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
            className="w-full mt-4 flex items-center justify-center gap-2 rounded-full bg-(--color-accent) text-white font-semibold text-sm py-3 disabled:opacity-50"
          >
            <CheckCircle size={16} /> {submitting ? "Saving..." : "Log Complete Workout Session"}
          </button>
        </Card>
      )}
    </div>
  );
}
