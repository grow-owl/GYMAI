import { useState, useEffect, useCallback } from "react";
import { Plus, Wrench, Loader2, RefreshCw, Pencil, Trash2 } from "lucide-react";

import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import CustomSelect from "@/components/ui/CustomSelect";
import Modal from "@/components/ui/Modal";
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

const equipmentStatusOptions = [
  { value: "WORKING", label: "WORKING" },
  { value: "MAINTENANCE", label: "MAINTENANCE" },
  { value: "BROKEN", label: "BROKEN" },
];

export default function Equipment() {
  const { gymId, branchId, loading: resolvingBranch } = useGymBranch();
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const [newEquipment, setNewEquipment] = useState({
    name: "",
    category: "strength",
    status: "WORKING",
  });

  const [editEquipment, setEditEquipment] = useState({
    id: "",
    name: "",
    category: "strength",
    status: "WORKING",
  });

  const [showMaintenanceDueOnly, setShowMaintenanceDueOnly] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const fetchEquipment = useCallback(async () => {
    if (!gymId) {
      setEquipmentList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (showMaintenanceDueOnly) {
        const res = await equipmentApi.getMaintenanceDue(gymId);
        const list = Array.isArray(res) ? res : (res as any)?.equipment || [];
        setEquipmentList(list);
      } else if (branchId) {
        const res = await equipmentApi.list(gymId, branchId);
        const list = Array.isArray(res) ? res : (res as any)?.equipment || [];
        setEquipmentList(list);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to load equipment");
      setEquipmentList([]);
    } finally {
      setLoading(false);
    }
  }, [gymId, branchId, showMaintenanceDueOnly]);

  useEffect(() => {
    fetchEquipment();
    setPage(1);
  }, [fetchEquipment]);

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeGymId = gymId || "";
    const activeBranchId = branchId || "";

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

  const handleEditEquipment = (item: any) => {
    setEditEquipment({
      id: item._id || item.id,
      name: item.name || "",
      category: item.category || "strength",
      status: item.status || "WORKING",
    });
    setShowEditModal(true);
  };

  const handleUpdateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingEdit(true);
    try {
      await equipmentApi.update(editEquipment.id, {
        name: editEquipment.name,
        category: editEquipment.category,
        status: editEquipment.status,
      });
      toast.success(`Equipment "${editEquipment.name}" updated successfully!`);
      setShowEditModal(false);
      fetchEquipment();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to update equipment.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteEquipment = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete equipment "${name}"?`)) return;
    try {
      await equipmentApi.delete(id);
      toast.success(`Equipment "${name}" deleted.`);
      fetchEquipment();
    } catch {
      toast.error("Failed to delete equipment item.");
    }
  };

  const handleSetExactStatus = async (id: string, status: string) => {
    try {
      await equipmentApi.updateStatus(id, status);
      toast.success(`Equipment status updated to ${status}.`);
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
              onClick={() => setShowMaintenanceDueOnly(!showMaintenanceDueOnly)}
              className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                showMaintenanceDueOnly
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  : "bg-(--color-surface-2) text-(--color-text-muted) hover:text-(--color-text)"
              }`}
              title="Toggle Maintenance Due Equipment"
            >
              <Wrench size={14} /> {showMaintenanceDueOnly ? "Maintenance Due Only" : "All Equipment"}
            </button>
            <button
              onClick={fetchEquipment}
              className="inline-flex items-center gap-1 text-xs text-(--color-text-muted) hover:text-(--color-text) p-2 rounded-lg bg-(--color-surface-2) cursor-pointer"
              title="Refresh Equipment"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-(--color-accent)" : ""} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-(--color-accent) text-(--color-navbar) text-sm font-bold px-4 py-2 hover:opacity-90 cursor-pointer"
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
            {equipmentList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((item) => {
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
                    <button
                      onClick={() => handleEditEquipment(item)}
                      className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-all cursor-pointer"
                      title="Edit Equipment"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteEquipment(eqId, item.name)}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                      title="Delete Equipment"
                    >
                      <Trash2 size={15} />
                    </button>

                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {equipmentList.length > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-(--color-border)">
              <p className="text-xs text-(--color-text-muted)">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, equipmentList.length)} of {equipmentList.length} items
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-xs bg-(--color-surface-2) text-(--color-text) disabled:opacity-40 hover:bg-(--color-accent)/10 transition-colors"
                >
                  ← Prev
                </button>
                <span className="px-3 py-1.5 text-xs text-(--color-text-muted)">Page {page} of {Math.ceil(equipmentList.length / PAGE_SIZE)}</span>
                <button
                  onClick={() => setPage((p) => Math.min(Math.ceil(equipmentList.length / PAGE_SIZE), p + 1))}
                  disabled={page >= Math.ceil(equipmentList.length / PAGE_SIZE)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-(--color-surface-2) text-(--color-text) disabled:opacity-40 hover:bg-(--color-accent)/10 transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Add Equipment Modal */}
      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)} maxWidth="md" title="Register Gym Equipment">
          <form onSubmit={handleAddEquipment} className="space-y-4">
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
                className="flex-1 py-2.5 rounded-xl bg-(--color-accent) text-(--color-navbar) text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
              >
                {submittingAdd ? <Loader2 className="w-4 h-4 animate-spin" /> : "Register Machine"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Equipment Modal */}
      {showEditModal && (
        <Modal onClose={() => setShowEditModal(false)} maxWidth="md" title="Edit Gym Equipment">
          <form onSubmit={handleUpdateEquipment} className="space-y-4">
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-(--color-text-muted) mb-1 font-medium">Equipment Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Commercial Treadmill T80"
                  value={editEquipment.name}
                  onChange={(e) => setEditEquipment({ ...editEquipment, name: e.target.value })}
                  className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border) focus:outline-none focus:border-(--color-accent)"
                />
              </div>

              <div>
                <label className="block text-(--color-text-muted) mb-1 font-medium">Category</label>
                <CustomSelect
                  value={editEquipment.category}
                  onChange={(val) => setEditEquipment({ ...editEquipment, category: val })}
                  options={equipmentCategoryOptions}
                />
              </div>

              <div>
                <label className="block text-(--color-text-muted) mb-1 font-medium">Operating Status</label>
                <CustomSelect
                  value={editEquipment.status}
                  onChange={(val) => setEditEquipment({ ...editEquipment, status: val })}
                  options={equipmentStatusOptions}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-(--color-surface-2) text-xs font-semibold text-(--color-text)"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingEdit}
                className="flex-1 py-2.5 rounded-xl bg-(--color-accent) text-(--color-navbar) text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
              >
                {submittingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
