import { useState, useEffect } from "react";
import { Plus, Wrench, Loader2, RefreshCw } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import CustomSelect from "@/components/ui/CustomSelect";
import { equipmentApi } from "@/lib/endpoints";
import { useGymBranch } from "@/hooks/useGymBranch";
import { toast } from "sonner";

const statusTone: Record<string, "good" | "warn" | "danger"> = {
  WORKING: "good",
  MAINTENANCE: "warn",
  BROKEN: "danger",
};

const equipmentCategoryOptions = [
  { value: "strength", label: "Strength & Weight Machine" },
  { value: "cardio", label: "Cardio Equipment" },
  { value: "free_weights", label: "Free Weights & Dumbbells" },
  { value: "accessories", label: "Accessories & Cables" },
];

export default function Equipment() {
  const { gymId, branchId, loading: resolvingBranch } = useGymBranch();
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Clear old cached mock localStorage items on mount
  useEffect(() => {
    try {
      localStorage.removeItem("gymai.equipment_list");
    } catch {}
  }, []);

  const [newEquipment, setNewEquipment] = useState({
    name: "",
    category: "strength",
    status: "WORKING",
  });

  const fetchEquipment = async () => {
    if (!gymId || !branchId) {
      setEquipmentList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await equipmentApi.list(gymId, branchId);
      const list = Array.isArray(res) ? res : (res as any)?.equipment || [];
      setEquipmentList(list);
    } catch {
      setEquipmentList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, [gymId, branchId]);

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeGymId = gymId || "65a000000000000000000001";
    const activeBranchId = branchId || "65a000000000000000000002";

    setSubmittingAdd(true);
    try {
      await equipmentApi.add(activeGymId, activeBranchId, newEquipment);
      toast.success(`Equipment ${newEquipment.name} registered!`);
      setShowAddModal(false);
      setNewEquipment({ name: "", category: "strength", status: "WORKING" });
      fetchEquipment();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || err.message || "Failed to register equipment.");
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleSetExactStatus = async (id: string, targetStatus: string) => {
    try {
      await equipmentApi.updateStatus(id, targetStatus);
      toast.success(`Equipment status updated to ${targetStatus}`);
      fetchEquipment();
    } catch {
      toast.error("Failed to update equipment status.");
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Equipment Maintenance"
        subtitle="Gym Machines & Maintenance Log"
        backTo="/owner"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchEquipment}
              className="inline-flex items-center gap-1 text-xs text-(--color-text-muted) hover:text-(--color-text) p-2 rounded-lg bg-(--color-surface-2)"
              title="Refresh Equipment"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-(--color-accent)" : ""} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-(--color-accent) text-white text-sm font-medium px-4 py-2 hover:opacity-90"
            >
              <Plus size={15} /> Add equipment
            </button>
          </div>
        }
      />

      {resolvingBranch || loading ? (
        <Card className="flex items-center justify-center p-12 text-sm text-(--color-text-muted) gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-(--color-accent)" /> Loading equipment items...
        </Card>
      ) : equipmentList.length === 0 ? (
        <Card className="text-center py-12 text-(--color-text-muted) space-y-2">
          <Wrench className="w-8 h-8 mx-auto text-(--color-text-faint)" />
          <p className="text-sm font-medium text-(--color-text)">No equipment logged in database</p>
          <p className="text-xs text-(--color-text-muted)">Click "Add equipment" to log machines and gear.</p>
        </Card>
      ) : (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {equipmentList.map((item) => {
              const eqId = item._id || item.id;
              const status = item.status || "WORKING";
              return (
                <div key={eqId} className="p-3.5 rounded-xl border border-(--color-border) bg-(--color-surface-2)/40 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-display text-sm font-semibold text-(--color-text)">{item.name}</h4>
                    <p className="text-xs text-(--color-text-muted) capitalize mt-0.5">{item.category}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone[status] || "good"}>{status}</Badge>

                    {status !== "WORKING" && (
                      <button
                        onClick={() => handleSetExactStatus(eqId, "WORKING")}
                        className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-medium"
                      >
                        Mark Working
                      </button>
                    )}
                    {status !== "MAINTENANCE" && (
                      <button
                        onClick={() => handleSetExactStatus(eqId, "MAINTENANCE")}
                        className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs font-medium"
                      >
                        Maintenance
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Add Equipment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={handleAddEquipment} className="w-full max-w-md rounded-2xl bg-(--color-surface) p-6 border border-(--color-border) space-y-4 shadow-2xl">
            <h3 className="font-display text-lg font-bold text-(--color-text)">Register Gym Equipment</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-(--color-text-muted) mb-1 font-medium">Equipment Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Commercial Treadmill T80"
                  value={newEquipment.name}
                  onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
                  className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border) focus:outline-none focus:border-(--color-accent)"
                />
              </div>

              <div>
                <label className="block text-(--color-text-muted) mb-1 font-medium">Category</label>
                <CustomSelect
                  value={newEquipment.category}
                  onChange={(val) => setNewEquipment({ ...newEquipment, category: val })}
                  options={equipmentCategoryOptions}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-(--color-surface-2) text-xs font-semibold text-(--color-text)"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAdd}
                className="flex-1 py-2.5 rounded-xl bg-(--color-accent) text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
              >
                {submittingAdd ? <Loader2 className="w-4 h-4 animate-spin" /> : "Register Machine"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
