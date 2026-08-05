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
  completionValue: number;
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
          let completionValue = 50;

          if (cId) {
            const [histRes, planRes] = await Promise.all([
              progressApi.getHistory(cId).catch(() => null),
              workoutApi.getActivePlan(cId).catch(() => null),
            ]);

            const history = histRes?.history || (Array.isArray(histRes) ? histRes : []);
            if (Array.isArray(history) && history.length > 0) {
              const sorted = [...history].sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
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
            }

            if (planRes && (planRes.plan || planRes.title || planRes.name)) {
              const p = planRes.plan || planRes;
              planTitle = p.title || p.name || "Active Workout Plan";
              if (Array.isArray(p.exercises) && p.exercises.length > 0) {
                completionValue = Math.min(100, Math.max(20, p.exercises.length * 20));
              }
            }
          }

          return {
            id: String(cId || name),
            name,
            planTitle,
            latestWeight,
            weightChange,
            completionValue,
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
            className="inline-flex items-center gap-1.5 p-2 rounded-lg bg-(--color-surface-2) text-xs text-(--color-text-muted) hover:text-(--color-text)"
            title="Refresh Progress"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-(--color-accent)" : ""} />
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
        <div className="space-y-4">
          {clientProgress.map((p) => (
            <Card key={p.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-(--color-text)">{p.name}</p>
                  <p className="text-xs text-(--color-text-muted) mt-0.5 flex items-center gap-1">
                    <Dumbbell size={12} className="text-(--color-accent)" />
                    {p.planTitle}
                  </p>
                </div>
                <div className="text-right">
                  {p.latestWeight !== null && (
                    <p className="text-sm font-bold text-(--color-text)">
                      {p.latestWeight} <span className="text-xs font-normal text-(--color-text-muted)">kg</span>
                    </p>
                  )}
                  <span className="text-xs text-(--color-good) font-medium">{p.weightChange}</span>
                </div>
              </div>
              <ProgressBar value={p.completionValue} max={100} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
