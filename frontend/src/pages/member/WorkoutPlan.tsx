import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Dumbbell, Loader2, Calendar } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { memberApi, workoutApi } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";

export default function WorkoutPlan() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [activePlan, setActivePlan] = useState<any | null>(null);

  useEffect(() => {
    async function loadPlan() {
      setLoading(true);
      try {
        const profRes = await memberApi.getSelfProfile().catch(() => null);
        const memberId = profRes?.member?._id || user?._id;
        if (memberId) {
          const planRes = await workoutApi.getActivePlan(memberId).catch(() => null);
          const plan = planRes?.plan || planRes;
          if (plan && (plan._id || plan.id || plan.title)) {
            setActivePlan(plan);
          }
        }
      } catch (err) {
        console.error("Failed to load active workout plan:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPlan();
  }, [user]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Workout Plan" subtitle="Loading your active training schedule..." backTo="/member" />
        <Card className="flex items-center justify-center p-12 text-sm text-(--color-text-muted) gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-(--color-accent)" /> Loading workout plan...
        </Card>
      </div>
    );
  }

  if (!activePlan || !activePlan.days || activePlan.days.length === 0) {
    return (
      <div>
        <PageHeader title="Workout Plan" subtitle="Your active workout routine" backTo="/member" />
        <Card className="text-center py-12 text-(--color-text-muted) space-y-3">
          <Dumbbell className="w-12 h-12 mx-auto text-(--color-text-faint)" />
          <p className="text-base font-bold text-(--color-text)">No Workout Plan Assigned Yet</p>
          <p className="text-xs text-(--color-text-muted) max-w-sm mx-auto">
            Your trainer has not assigned an active workout routine to your profile. Please ask your trainer to create a plan for you.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={activePlan.title || "Workout Plan"}
        subtitle={`Goal: ${activePlan.goal || "Fitness & Strength"} · ${activePlan.days.length} Days / Week`}
        backTo="/member"
      />

      <div className="space-y-4">
        {activePlan.days.map((d: any, idx: number) => {
          const dayTitle = d.dayLabel || d.dayName || `Day ${idx + 1}`;
          const exercises = d.exercises || [];

          return (
            <Card key={idx} className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-(--color-border) pb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-(--color-accent)" />
                  <h3 className="font-display text-sm font-bold text-(--color-text)">{dayTitle}</h3>
                </div>
                <Badge tone="good">{exercises.length} Exercises</Badge>
              </div>

              {exercises.length === 0 ? (
                <p className="text-xs text-(--color-text-faint) italic">Rest Day / Active Recovery</p>
              ) : (
                <div className="space-y-2">
                  {exercises.map((ex: any, exIdx: number) => {
                    const exName = typeof ex.exerciseId === "object" ? ex.exerciseId?.name : ex.exerciseName || ex.name || "Exercise";
                    const sets = ex.targetSets || ex.sets || 3;
                    const reps = ex.targetReps || ex.reps || 10;
                    const weight = ex.targetWeightKg ? `${ex.targetWeightKg} kg` : null;
                    const rest = ex.restSeconds ? `${ex.restSeconds}s rest` : null;

                    return (
                      <div key={exIdx} className="flex items-center justify-between bg-(--color-surface-2) p-3 rounded-xl">
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-xs font-semibold text-(--color-text) truncate">{exName}</p>
                          <p className="text-[11px] text-(--color-text-muted) mt-0.5">
                            {sets} Sets × {reps} Reps {weight ? `· ${weight}` : ""} {rest ? `· ${rest}` : ""}
                          </p>
                          {ex.notes && <p className="text-[10px] text-amber-400 mt-0.5 italic">Note: {ex.notes}</p>}
                        </div>
                        <Link to="/member/workout-tracking" className="text-(--color-text-muted) hover:text-(--color-accent)">
                          <ChevronRight size={16} />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
