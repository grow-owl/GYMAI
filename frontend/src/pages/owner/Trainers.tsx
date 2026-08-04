import { useEffect, useState } from "react";
import { Award, Loader2, Plus, UserPlus, RefreshCw, Dumbbell } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { useGymBranch } from "@/hooks/useGymBranch";
import { trainerApi } from "@/lib/endpoints";
import { toast } from "sonner";

interface TrainerRow {
  _id: string;
  name?: string;
  specialization?: string;
  clients?: number;
  userId?: { fullName?: string; email?: string; phone?: string };
  specializations?: string[];
  maxMemberCapacity?: number;
}

export default function Trainers() {
  const { gymId, branchId, loading: resolvingBranch } = useGymBranch();
  const [trainers, setTrainers] = useState<TrainerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerRow | null>(null);
  const [memberIdInput, setMemberIdInput] = useState("");

  const [newTrainer, setNewTrainer] = useState({
    fullName: "",
    email: "",
    phone: "",
    specializations: "Strength & Conditioning",
  });

  const fetchTrainers = async () => {
    const activeGymId = gymId || "65a000000000000000000001";
    const activeBranchId = branchId || "65a000000000000000000002";
    setLoading(true);
    setError(null);
    try {
      const res = await trainerApi.list(activeGymId, activeBranchId);
      const list = Array.isArray(res) ? res : res?.trainers || [];
      setTrainers(list as TrainerRow[]);
    } catch {
      setError("Failed to load trainers from backend.");
      setTrainers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainers();
  }, [gymId, branchId]);

  const handleAddTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (gymId && branchId) {
        await trainerApi.create(gymId, branchId, {
          ...newTrainer,
          specializations: newTrainer.specializations.split(",").map((s) => s.trim()),
        });
      }
      toast.success(`Trainer ${newTrainer.fullName} added successfully!`);
      setShowAddModal(false);
      fetchTrainers();
    } catch {
      toast.error("Failed to add trainer.");
    }
  };

  const handleAssignClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainer || !memberIdInput.trim()) return;
    try {
      if (gymId && branchId) {
        await trainerApi.assignClient(gymId, branchId, selectedTrainer._id, memberIdInput);
      }
      toast.success(`Client assigned to ${selectedTrainer.name || selectedTrainer.userId?.fullName}!`);
      setShowAssignModal(false);
      setMemberIdInput("");
      fetchTrainers();
    } catch {
      toast.error("Failed to assign client.");
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Trainers"
        subtitle={`${trainers.length} active trainers`}
        backTo="/owner"
        action={
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-(--color-accent) text-white text-sm font-medium px-4 py-2 hover:opacity-90 transition-opacity"
          >
            <Plus size={15} /> Add trainer
          </button>
        }
      />

      {(resolvingBranch || loading) ? (
        <div className="flex items-center gap-2 text-sm text-(--color-text-faint) py-10 justify-center">
          <Loader2 size={16} className="animate-spin text-(--color-accent)" /> Loading trainers…
        </div>
      ) : error ? (
        <Card className="text-center py-8">
          <p className="text-sm text-(--color-danger) mb-3">{error}</p>
          <button
            onClick={fetchTrainers}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-full bg-(--color-surface-3) text-(--color-text)"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </Card>
      ) : trainers.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <Dumbbell className="w-8 h-8 text-(--color-text-faint) mb-2 opacity-50" />
          <p className="text-sm font-medium text-(--color-text)">No trainers registered yet</p>
          <p className="text-xs text-(--color-text-faint) mt-1 max-w-xs">
            Click the "Add trainer" button above to onboard your gym's personal trainers.
          </p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trainers.map((t, idx) => {
            const name = t.name || t.userId?.fullName || "Unnamed Trainer";
            const spec = t.specialization || t.specializations?.join(", ") || "Fitness & Bodybuilding";
            const clientsCount = t.clients ?? t.maxMemberCapacity ?? 0;
            const phone = t.userId?.phone || "—";

            return (
              <Card key={t._id || idx} className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-(--color-surface-3) text-sm font-semibold text-(--color-text)">
                      {name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-(--color-text)">{name}</p>
                      <p className="text-xs text-(--color-text-faint)">{spec}</p>
                    </div>
                  </div>
                  <button
                    title="Assign Member"
                    onClick={() => {
                      setSelectedTrainer(t);
                      setShowAssignModal(true);
                    }}
                    className="p-2 rounded-lg border border-(--color-border) text-(--color-text-muted) hover:bg-(--color-accent-soft) hover:text-(--color-accent-text)"
                  >
                    <UserPlus size={15} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-(--color-surface-2) py-2.5">
                    <Award size={14} className="mx-auto mb-1 text-(--color-text-faint)" />
                    <p className="text-sm font-semibold text-(--color-text)">{clientsCount}</p>
                    <p className="text-[10px] text-(--color-text-faint)">Clients assigned</p>
                  </div>
                  <div className="rounded-xl bg-(--color-surface-2) py-2.5">
                    <p className="text-sm font-semibold text-(--color-text) truncate px-1">{phone}</p>
                    <p className="text-[10px] text-(--color-text-faint)">Phone</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Trainer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-5 w-full max-w-md space-y-4">
            <h3 className="text-base font-semibold text-(--color-text)">Add Trainer</h3>
            <form onSubmit={handleAddTrainer} className="space-y-3">
              <div>
                <label className="text-xs text-(--color-text-muted)">Full Name</label>
                <input
                  required
                  value={newTrainer.fullName}
                  onChange={(e) => setNewTrainer({ ...newTrainer, fullName: e.target.value })}
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                  placeholder="e.g. Vikram Singh"
                />
              </div>
              <div>
                <label className="text-xs text-(--color-text-muted)">Email</label>
                <input
                  type="email"
                  required
                  value={newTrainer.email}
                  onChange={(e) => setNewTrainer({ ...newTrainer, email: e.target.value })}
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                  placeholder="vikram@gym.com"
                />
              </div>
              <div>
                <label className="text-xs text-(--color-text-muted)">Specialization</label>
                <input
                  value={newTrainer.specializations}
                  onChange={(e) => setNewTrainer({ ...newTrainer, specializations: e.target.value })}
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                  placeholder="Strength, Crossfit, Weight Loss"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-(--color-text-muted)"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-xs font-medium rounded-full bg-(--color-accent) text-white">
                  Save Trainer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Client Modal */}
      {showAssignModal && selectedTrainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-5 w-full max-w-md space-y-4">
            <h3 className="text-base font-semibold text-(--color-text)">
              Assign Client to {selectedTrainer.name || selectedTrainer.userId?.fullName}
            </h3>
            <form onSubmit={handleAssignClient} className="space-y-3">
              <div>
                <label className="text-xs text-(--color-text-muted)">Member ID</label>
                <input
                  required
                  value={memberIdInput}
                  onChange={(e) => setMemberIdInput(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                  placeholder="Enter Member ID"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-xs font-medium text-(--color-text-muted)"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-xs font-medium rounded-full bg-(--color-accent) text-white">
                  Assign Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
