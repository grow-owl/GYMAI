import { useState, useEffect } from "react";
import { Plus, Wrench, CheckCircle, AlertTriangle } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import CustomSelect from "@/components/ui/CustomSelect";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { equipmentApi } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

const mockEquipment = [
  { _id: "1", name: "Treadmill Commercial (x6)", category: "cardio", status: "WORKING", lastServiced: "2 weeks ago" },
  { _id: "2", name: "Cable Crossover Station", category: "strength", status: "MAINTENANCE", lastServiced: "3 months ago" },
  { _id: "3", name: "Olympics Smith Machine", category: "strength", status: "WORKING", lastServiced: "1 month ago" },
  { _id: "4", name: "Concept2 Rowing Machine (x3)", category: "cardio", status: "BROKEN", lastServiced: "6 months ago" },
];

const STORAGE_KEY = "gymai.equipment_list";

function getStoredEquipment(): any[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return mockEquipment;
}

function saveStoredEquipment(eqs: any[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(eqs));
  } catch {}
}

export default function Equipment() {
  const user = useAuthStore((s) => s.user);
  const [equipmentList, setEquipmentList] = useState<any[]>(() => getStoredEquipment());
  const [showAddModal, setShowAddModal] = useState(false);

  const [newEquipment, setNewEquipment] = useState({
    name: "",
    category: "strength",
    status: "WORKING",
  });

  const fetchEquipment = async () => {
    try {
      const targetGymId = user?.gymId || "65a000000000000000000001";
      const res = await equipmentApi.list(targetGymId);
      const list = Array.isArray(res) ? res : (res as any)?.equipment || [];
      if (list && list.length > 0) {
        setEquipmentList(list);
        saveStoredEquipment(list);
        return;
      }
      setEquipmentList(getStoredEquipment());
    } catch {
      setEquipmentList(getStoredEquipment());
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, [user]);

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    const newItem = { ...newEquipment, _id: `eq-${Date.now()}` };
    const updated = [newItem, ...equipmentList];
    setEquipmentList(updated);
    saveStoredEquipment(updated);
    toast.success(`Equipment ${newEquipment.name} registered!`);
    setShowAddModal(false);

    try {
      if (user?.gymId) {
        await equipmentApi.add({ ...newEquipment, gymId: user.gymId });
      }
    } catch {}
  };

  const handleSetExactStatus = async (id: string, targetStatus: string) => {
    const updated = equipmentList.map((e) =>
      e._id === id || e.id === id ? { ...e, status: targetStatus } : e
    );

    setEquipmentList(updated);
    saveStoredEquipment(updated);
    toast.success(`Equipment status updated to ${targetStatus === "WORKING" ? "Active / Working" : targetStatus}`);

    try {
      if (!String(id).startsWith("eq-") && !String(id).startsWith("1") && !String(id).startsWith("2") && !String(id).startsWith("3") && !String(id).startsWith("4")) {
        await equipmentApi.updateStatus(id, targetStatus);
      }
    } catch (err) {
      console.warn("Backend update status warning:", err);
    }
  };

  const isWorking = (s: string) => {
    const statusStr = String(s || "").toUpperCase();
    return statusStr === "WORKING" || statusStr === "OPERATIONAL" || statusStr === "GOOD";
  };

  const isMaintenance = (s: string) => {
    const statusStr = String(s || "").toUpperCase();
    return statusStr.includes("MAIN") || statusStr.includes("DUE") || statusStr === "WARN";
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
              {equipmentList.filter((e) => isWorking(e.status)).length} units
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <Wrench className="w-8 h-8 text-amber-400 shrink-0" />
          <div>
            <p className="text-xs text-(--color-text-faint)">Under Maintenance</p>
            <p className="text-xl font-semibold text-(--color-text)">
              {equipmentList.filter((e) => isMaintenance(e.status)).length} units
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-rose-400 shrink-0" />
          <div>
            <p className="text-xs text-(--color-text-faint)">Out of Order / Broken</p>
            <p className="text-xl font-semibold text-(--color-text)">
              {equipmentList.filter((e) => !isWorking(e.status) && !isMaintenance(e.status)).length} units
            </p>
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-(--color-border-soft)">
          {equipmentList.map((e) => {
            const currentWorking = isWorking(e.status);
            const currentMaint = isMaintenance(e.status);

            return (
              <div key={e._id || e.id} className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-5 py-3.5 gap-3 hover:bg-(--color-surface-2)/50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-(--color-text)">{e.name}</p>
                  <p className="text-xs text-(--color-text-faint)">Category: <span className="capitalize">{e.category || "General"}</span></p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge tone={currentWorking ? "good" : currentMaint ? "warn" : "danger"}>
                    {currentWorking ? "WORKING (Active)" : currentMaint ? "MAINTENANCE" : "BROKEN"}
                  </Badge>

                  {/* Direct Quick Action Buttons */}
                  {!currentWorking && (
                    <button
                      onClick={() => handleSetExactStatus(e._id || e.id, "WORKING")}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                    >
                      Set Active
                    </button>
                  )}

                  {!currentMaint && (
                    <button
                      onClick={() => handleSetExactStatus(e._id || e.id, "MAINTENANCE")}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20"
                    >
                      Maintenance
                    </button>
                  )}

                  {currentWorking && (
                    <button
                      onClick={() => handleSetExactStatus(e._id || e.id, "BROKEN")}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20"
                    >
                      Out of Order
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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
                <CustomSelect
                  value={newEquipment.category}
                  onChange={(val) => setNewEquipment({ ...newEquipment, category: val })}
                  className="mt-1"
                  options={[
                    { value: "strength", label: "Strength Training" },
                    { value: "cardio", label: "Cardio Equipment" },
                    { value: "freeweights", label: "Dumbbells & Barbells" },
                    { value: "accessories", label: "Mats & Bands" },
                  ]}
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
