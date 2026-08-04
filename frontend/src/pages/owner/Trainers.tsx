import { useEffect, useState } from "react";
import { Award, Loader2, AlertTriangle } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { useGymBranch } from "@/hooks/useGymBranch";
import { trainerApi } from "@/lib/endpoints";

interface TrainerRow {
  _id: string;
  userId?: { fullName?: string; email?: string; phone?: string };
  specializations?: string[];
  maxMemberCapacity?: number;
}

export default function Trainers() {
  const { gymId, branchId, loading: resolvingBranch, error: branchError } = useGymBranch();
  const [trainers, setTrainers] = useState<TrainerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gymId || !branchId) return;
    setLoading(true);
    trainerApi
      .list(gymId, branchId)
      .then((res) => setTrainers(res.trainers as TrainerRow[]))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load trainers"))
      .finally(() => setLoading(false));
  }, [gymId, branchId]);

  return (
    <div>
      <PageHeader title="Trainers" subtitle={`${trainers.length} active trainers`} backTo="/owner" />

      {(resolvingBranch || loading) && (
        <div className="flex items-center gap-2 text-sm text-(--color-text-faint) py-10 justify-center">
          <Loader2 size={16} className="animate-spin" /> Loading trainers…
        </div>
      )}

      {(branchError || error) && !loading && !resolvingBranch && (
        <div className="flex items-center gap-2 text-sm text-(--color-danger) py-10 justify-center">
          <AlertTriangle size={16} /> {branchError || error}
        </div>
      )}

      {!resolvingBranch && !loading && !error && !branchError && trainers.length === 0 && (
        <p className="text-sm text-(--color-text-faint) py-10 text-center">
          No trainers yet — add one from Settings once your branch is set up.
        </p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {trainers.map((t) => {
          const name = t.userId?.fullName ?? "Unnamed trainer";
          return (
            <Card key={t._id} className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-(--color-surface-3) text-sm font-semibold text-(--color-text)">
                  {name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </span>
                <div>
                  <p className="text-sm font-medium text-(--color-text)">{name}</p>
                  <p className="text-xs text-(--color-text-faint)">
                    {t.specializations?.length ? t.specializations.join(", ") : "No specialization set"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-(--color-surface-2) py-2.5">
                  <Award size={14} className="mx-auto mb-1 text-(--color-text-faint)" />
                  <p className="text-sm font-semibold text-(--color-text)">{t.maxMemberCapacity ?? "—"}</p>
                  <p className="text-[10px] text-(--color-text-faint)">Client capacity</p>
                </div>
                <div className="rounded-xl bg-(--color-surface-2) py-2.5">
                  <p className="text-sm font-semibold text-(--color-text) truncate px-1">{t.userId?.phone ?? "—"}</p>
                  <p className="text-[10px] text-(--color-text-faint)">Phone</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
