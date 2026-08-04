import { useState, useEffect } from "react";
import { Plus, Wrench, CheckCircle, AlertTriangle } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { equipmentApi } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

const mockEquipment = [
  { _id: "1", name: "Treadmill Commercial (x6)", category: "cardio", status: "OPERATIONAL", lastServiced: "2 weeks ago" },
  { _id: "2", name: "Cable Crossover Station", category: "strength", status: "MAINTENANCE_DUE", lastServiced: "3 months ago" },
  { _id: "3", name: "Olympics Smith Machine", category: "strength", status: "OPERATIONAL", lastServiced: "1 month ago" },
  { _id: "4", name: "Concept2 Rowing Machine (x3)", category: "cardio", status: "BROKEN", lastServiced: "6 months ago" },
];

export default function Equipment() {
  const user = useAuthStore((s) => s.user);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newEquipment, setNewEquipment] = useState({
    name: "",
    category: "strength",
    status: "OPERATIONAL",
  });

  const fetchEquipment = async () => {
    try {
      if (user?.gymId) {
        const res = await equipmentApi.list(user.gymId);
        if (Array.isArray(res) && res.length > 0) {
          setEquipmentList(res);
          return;
        }
      }
      setEquipmentList(mockEquipment);
    } catch {
      setEquipmentList(mockEquipment);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, [user]);

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (user?.gymId) {
        await equipmentApi.add({ ...newEquipment, gymId: user.gymId });
      }
      toast.success(`Equipment ${newEquipment.name} registered!`);
      setShowAddModal(false);
      fetchEquipment();
    } catch {
      toast.error("Failed to add equipment.");
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await equipmentApi.updateStatus(id, newStatus);
      setEquipmentList((prev) =>
        prev.map((e) => (e._id === id ? { ...e, status: newStatus } : e))
      );
      toast.success(`Equipment status updated to ${newStatus}`);
    } catch {
      toast.error("Failed to update status.");
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Equipment Maintenance"
        subtitle="Machine condition & maintenance tracking"
        backTo="/owner"
        action={
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-(--color-accent) text-white text-sm font-medium px-4 py-2 hover:opacity-90"
          >
            <Plus size={15} /> Add equipment
          </button>
        }
      />

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="flex items-center gap-3">
          <CheckCircle className="w-8 h-8 text-emerald-400 shrink-0" />
          <div>
            <p className="text-xs text-(--color-text-faint)">Operational Machines</p>
            <p className="text-xl font-semibold text-(--color-text)">
              {equipmentList.filter((e) => e.status === "OPERATIONAL" || e.status === "good").length} units
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <Wrench className="w-8 h-8 text-amber-400 shrink-0" />
          <div>
            <p className="text-xs text-(--color-text-faint)">Maintenance Due</p>
            <p className="text-xl font-semibold text-(--color-text)">
              {equipmentList.filter((e) => e.status === "MAINTENANCE_DUE" || e.status === "warn").length} units
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-rose-400 shrink-0" />
          <div>
            <p className="text-xs text-(--color-text-faint)">Out of Order / Broken</p>
            <p className="text-xl font-semibold text-(--color-text)">
              {equipmentList.filter((e) => e.status === "BROKEN" || e.status === "danger").length} units
            </p>
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-(--color-border-soft)">
          {equipmentList.map((e) => (
            <div key={e._id} className="flex items-center justify-between px-4 sm:px-5 py-3.5 hover:bg-(--color-surface-2)/50 transition-colors">
              <div>
                <p className="text-sm font-medium text-(--color-text)">{e.name}</p>
                <p className="text-xs text-(--color-text-faint)">Category: <span className="capitalize">{e.category || "General"}</span></p>
              </div>

              <div className="flex items-center gap-3">
                <Badge
                  tone={
                    e.status === "OPERATIONAL" || e.status === "good"
                      ? "good"
                      : e.status === "MAINTENANCE_DUE" || e.status === "warn"
                      ? "warn"
                      : "danger"
                  }
                >
                  {e.status}
                </Badge>
                <button
                  onClick={() => handleUpdateStatus(e._id, e.status === "OPERATIONAL" ? "MAINTENANCE_DUE" : "OPERATIONAL")}
                  className="px-3 py-1 text-xs font-medium rounded-full border border-(--color-border) text-(--color-text-muted) hover:text-(--color-text)"
                >
                  Toggle Status
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Add Equipment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-5 w-full max-w-md space-y-4">
            <h3 className="text-base font-semibold text-(--color-text)">Add Machine / Equipment</h3>
            <form onSubmit={handleAddEquipment} className="space-y-3">
              <div>
                <label className="text-xs text-(--color-text-muted)">Machine Name</label>
                <input
                  required
                  value={newEquipment.name}
                  onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                  placeholder="e.g. Leg Press Machine"
                />
              </div>
              <div>
                <label className="text-xs text-(--color-text-muted)">Category</label>
                <select
                  value={newEquipment.category}
                  onChange={(e) => setNewEquipment({ ...newEquipment, category: e.target.value })}
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                >
                  <option value="strength">Strength Training</option>
                  <option value="cardio">Cardio Equipment</option>
                  <option value="freeweights">Dumbbells & Barbells</option>
                  <option value="accessories">Mats & Bands</option>
                </select>
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
                  Save Equipment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
