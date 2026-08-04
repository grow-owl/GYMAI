import { useEffect, useState } from "react";
import { Award, Loader2, Plus, UserPlus, RefreshCw, Dumbbell, Trash2, Search } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import CustomSelect from "@/components/ui/CustomSelect";
import Card from "@/components/ui/Card";
import { useGymBranch } from "@/hooks/useGymBranch";
import { trainerApi, memberApi } from "@/lib/endpoints";
import { useSearchStore } from "../../store/searchStore";
import { toast } from "sonner";

interface TrainerRow {
  _id: string;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  specialization?: string;
  clients?: number;
  assignedMembersCount?: number;
  activeClientsCount?: number;
  status?: string;
  userId?: { fullName?: string; email?: string; phone?: string };
  specializations?: string[];
  maxMemberCapacity?: number;
}

const STORAGE_KEY = "gymai.trainers_list";

function getStoredTrainers(): TrainerRow[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
}

function saveStoredTrainers(list: TrainerRow[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

function mergeTrainerList(backendList: TrainerRow[], storedList: TrainerRow[]): TrainerRow[] {
  const map = new Map<string, TrainerRow>();
  for (const item of storedList) {
    if (item._id) map.set(item._id, item);
  }
  for (const item of backendList) {
    if (item._id) {
      const existing = map.get(item._id);
      map.set(item._id, existing ? { ...existing, ...item } : item);
    }
  }
  return Array.from(map.values());
}

export default function Trainers() {
  const { gymId, branchId, loading: resolvingBranch } = useGymBranch();
  const [trainers, setTrainers] = useState<TrainerRow[]>(() => getStoredTrainers());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { searchQuery: search, setSearchQuery: setSearch } = useSearchStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerRow | null>(null);

  // Members dropdown list for assigning
  const [membersList, setMembersList] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
const filteredMembersDropdown = membersList.filter((m) => {
  const q = memberSearchQuery.toLowerCase().trim();
  if (!q) return true;
  const name = (m.fullName || m.name || m.userId?.fullName || "").toLowerCase();
  const phone = (m.phone || m.userId?.phone || "").toLowerCase();
  return name.includes(q) || phone.includes(q);
});

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
      const [tRes, mRes] = await Promise.all([
        trainerApi.list(activeGymId, activeBranchId).catch(() => null),
        memberApi.list(activeGymId, activeBranchId).catch(() => null),
      ]);
      const list = Array.isArray(tRes) ? tRes : (tRes as any)?.trainers || [];
      const merged = mergeTrainerList(list as TrainerRow[], getStoredTrainers());
      setTrainers(merged);
      saveStoredTrainers(merged);

      const mArray = Array.isArray(mRes) ? mRes : (mRes as any)?.members || [];
      setMembersList(mArray);
    } catch {
      const stored = getStoredTrainers();
      if (stored.length > 0) {
        setTrainers(stored);
      } else {
        setError("Failed to load trainers from backend.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainers();
  }, [gymId, branchId]);

  const handleAddTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeGymId = gymId || "65a000000000000000000001";
    const activeBranchId = branchId || "65a000000000000000000002";

    const newTrainerObj: TrainerRow = {
      _id: `tr-${Date.now()}`,
      fullName: newTrainer.fullName,
      email: newTrainer.email,
      phone: newTrainer.phone,
      specializations: newTrainer.specializations.split(",").map((s) => s.trim()),
      assignedMembersCount: 0,
      activeClientsCount: 0,
      status: "ACTIVE",
    };

    const updated = [newTrainerObj, ...trainers];
    setTrainers(updated);
    saveStoredTrainers(updated);
    toast.success(`Trainer ${newTrainer.fullName} added successfully!`);
    setShowAddModal(false);

    try {
      await trainerApi.create(activeGymId, activeBranchId, {
        ...newTrainer,
        specializations: newTrainer.specializations.split(",").map((s) => s.trim()),
      });
      fetchTrainers();
    } catch (err) {
      console.warn("Backend add trainer warning:", err);
    }
  };

  const handleAssignClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainer || !selectedMemberId) {
      toast.error("Please select a member to assign");
      return;
    }
    const activeGymId = gymId || "65a000000000000000000001";
    const activeBranchId = branchId || "65a000000000000000000002";
    const chosenMem = membersList.find((m) => m._id === selectedMemberId || m.id === selectedMemberId);
    const chosenName = chosenMem?.fullName || chosenMem?.name || chosenMem?.userId?.fullName || "Member";

    const prevTrainerId = chosenMem?.assignedTrainerId?._id || chosenMem?.assignedTrainerId || chosenMem?.trainerId;

    if (prevTrainerId === selectedTrainer._id) {
      toast.error(`${chosenName} is already assigned to ${selectedTrainer.fullName || selectedTrainer.name || "this trainer"}!`);
      return;
    }

    // Update trainers list counts (decrement previous trainer, increment new trainer)
    const updatedTrainers = trainers.map((t) => {
      if (t._id === selectedTrainer._id) {
        return {
          ...t,
          assignedMembersCount: (t.assignedMembersCount || t.clients || 0) + 1,
          clients: (t.clients || t.assignedMembersCount || 0) + 1,
        };
      }
      if (prevTrainerId && (t._id === prevTrainerId || (t as any).id === prevTrainerId)) {
        return {
          ...t,
          assignedMembersCount: Math.max(0, (t.assignedMembersCount || t.clients || 1) - 1),
          clients: Math.max(0, (t.clients || t.assignedMembersCount || 1) - 1),
        };
      }
      return t;
    });

    // Update members list state with new assignedTrainerId
    const updatedMembers = membersList.map((m) =>
      m._id === selectedMemberId || m.id === selectedMemberId
        ? { ...m, assignedTrainerId: selectedTrainer._id }
        : m
    );
    setMembersList(updatedMembers);

    setTrainers(updatedTrainers);
    saveStoredTrainers(updatedTrainers);

    const targetTrainerName = selectedTrainer.fullName || selectedTrainer.name || selectedTrainer.userId?.fullName || "Trainer";
    if (prevTrainerId) {
      toast.success(`Reassigned ${chosenName} to ${targetTrainerName}! (Previous trainer assignment removed)`);
    } else {
      toast.success(`Assigned ${chosenName} to trainer ${targetTrainerName}!`);
    }

    setShowAssignModal(false);
    setSelectedMemberId("");

    try {
      if (!selectedTrainer._id.startsWith("tr-")) {
        await trainerApi.assignClient(activeGymId, activeBranchId, selectedTrainer._id, selectedMemberId);
      }
    } catch (err) {
      console.warn("Backend assign client warning:", err);
    }
  };

  const handleDeleteTrainer = async (trainerId: string, trainerName: string) => {
    if (!window.confirm(`Are you sure you want to remove trainer "${trainerName}"?`)) return;
    const activeGymId = gymId || "65a000000000000000000001";
    const updated = trainers.filter((t) => t._id !== trainerId);
    setTrainers(updated);
    saveStoredTrainers(updated);
    toast.success(`Trainer ${trainerName} deleted!`);

    try {
      if (!trainerId.startsWith("tr-")) {
        await trainerApi.delete(activeGymId, trainerId);
      }
    } catch (err) {
      console.warn("Backend delete trainer warning:", err);
    }
  };

  const filteredTrainers = trainers.filter((t) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const name = (t.fullName || t.name || t.userId?.fullName || "").toLowerCase();
    const spec = (t.specialization || t.specializations?.join(", ") || "").toLowerCase();
    const phone = (t.phone || t.userId?.phone || "").toLowerCase();
    const email = (t.email || t.userId?.email || "").toLowerCase();
    return name.includes(q) || spec.includes(q) || phone.includes(q) || email.includes(q);
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Trainers"
        subtitle={`${filteredTrainers.length} showing · Active trainers`}
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

      <div className="flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface) px-4 py-2 text-sm text-(--color-text) max-w-sm">
        <Search size={15} className="text-(--color-text-faint)" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search trainers by name..."
          className="bg-transparent outline-none w-full placeholder:text-(--color-text-faint)"
        />
      </div>

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
      ) : filteredTrainers.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="w-8 h-8 text-(--color-text-faint) mb-2 opacity-50" />
          <p className="text-sm font-medium text-(--color-text)">No trainers match your search</p>
          <p className="text-xs text-(--color-text-faint) mt-1 max-w-xs">
            Try adjusting your search terms or clear the filter.
          </p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTrainers.map((t, idx) => {
            const name = t.fullName || t.name || t.userId?.fullName || "Unnamed Trainer";
            const spec = t.specialization || t.specializations?.join(", ") || "Fitness & Bodybuilding";
            const clientsCount = t.assignedMembersCount ?? t.clients ?? 0;
            const phone = t.phone || t.userId?.phone || "+91 9876543202";

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
                  <div className="flex items-center gap-1.5">
                    <button
                      title="Assign Member Client"
                      onClick={() => {
                        setSelectedTrainer(t);
                        setShowAssignModal(true);
                      }}
                      className="p-2 rounded-lg border border-(--color-border) text-(--color-text-muted) hover:bg-(--color-accent-soft) hover:text-(--color-accent-text)"
                    >
                      <UserPlus size={15} />
                    </button>
                    <button
                      title="Delete Trainer"
                      onClick={() => handleDeleteTrainer(t._id, name)}
                      className="p-2 rounded-lg border border-(--color-border) text-rose-400 hover:bg-rose-500/10 hover:text-rose-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
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
                  placeholder="e.g. Karan Johar"
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
                  placeholder="karan@gym.com"
                />
              </div>
              <div>
                <label className="text-xs text-(--color-text-muted)">Specialization</label>
                <input
                  value={newTrainer.specializations}
                  onChange={(e) => setNewTrainer({ ...newTrainer, specializations: e.target.value })}
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                  placeholder="Crossfit, Weight Loss"
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

      {/* Assign Client Modal with Searchable Member Dropdown */}
      {showAssignModal && selectedTrainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-5 w-full max-w-xl space-y-4 overflow-visible">
            <h3 className="text-base font-semibold text-(--color-text)">
              Assign Client to {selectedTrainer.fullName || selectedTrainer.name || selectedTrainer.userId?.fullName}
            </h3>
            <form onSubmit={handleAssignClient} className="space-y-3">
              <div>
                <label className="text-xs text-(--color-text-muted)">Search & Select Member</label>
                <div className="flex items-center gap-2 rounded-lg border border-(--color-border) bg-(--color-surface-2) px-3 py-1.5 my-1">
                  <Search size={14} className="text-(--color-text-faint)" />
                  <input
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    placeholder="Search member by name..."
                    className="bg-transparent text-xs text-(--color-text) outline-none w-full"
                  />
                </div>
                <CustomSelect
                  value={selectedMemberId}
                  onChange={setSelectedMemberId}
                  placeholder="-- Choose Member --"
                  required
                  options={[
                    ...filteredMembersDropdown.map((m) => {
                      const mName = m.fullName || m.name || m.userId?.fullName || "Member";
                      const mPhone = m.phone || m.userId?.phone || "";
                      const mAssignedTrainer = m.assignedTrainerId?.fullName || m.assignedTrainerId?.name || (m.assignedTrainerId ? "Another Trainer" : null);
                      const tag = mAssignedTrainer ? ` (Assigned to ${mAssignedTrainer} - Reassign)` : " (Unassigned)";
                      return {
                        value: m._id || m.id || "",
                        label: `${mName}${mPhone ? ` [${mPhone}]` : ""}${tag}`,
                      };
                    }),
                  ]}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedMemberId("");
                  }}
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
