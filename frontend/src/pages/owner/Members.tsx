import { useState, useEffect } from "react";
import { Search, Plus, Snowflake, CalendarPlus, XCircle, User, Loader2, RefreshCw, Users } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { memberApi } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { useSearchStore } from "../../store/searchStore";
import { toast } from "sonner";

const statusTone: Record<string, "good" | "warn" | "danger" | "accent"> = {
  active: "good",
  ACTIVE: "good",
  expiring: "warn",
  EXPIRING: "warn",
  overdue: "danger",
  CANCELLED: "danger",
  trial: "accent",
  FROZEN: "accent",
};

const STORAGE_KEY = "gymai.members_list";

function getStoredMembers(): any[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
}

function saveStoredMembers(list: any[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

function mergeMemberList(backendList: any[], storedList: any[]): any[] {
  const map = new Map<string, any>();
  // Put stored items first
  for (const item of storedList) {
    const key = item._id || item.id;
    if (key) map.set(String(key), item);
  }
  // Put backend items over stored items if backend has fuller data
  for (const item of backendList) {
    const key = item._id || item.id;
    if (key) {
      const existing = map.get(String(key));
      map.set(String(key), existing ? { ...existing, ...item } : item);
    }
  }
  return Array.from(map.values());
}

export default function Members() {
  const user = useAuthStore((s) => s.user);
  const [memberList, setMemberList] = useState<any[]>(() => getStoredMembers());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { searchQuery: search, setSearchQuery: setSearch } = useSearchStore();

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [activeModalType, setActiveModalType] = useState<"freeze" | "extend" | "cancel" | "view" | null>(null);

  // Form states
  const [formData, setFormData] = useState({ fullName: "", email: "", phone: "", planName: "Monthly Fitness" });
  const [reason, setReason] = useState("");
  const [extendDays, setExtendDays] = useState(30);

  const fetchMembers = async () => {
    const activeGymId = user?.gymId || "65a000000000000000000001";
    const activeBranchId = user?.branchId || "65a000000000000000000002";
    setLoading(true);
    setError(null);
    try {
      const res = await memberApi.list(activeGymId, activeBranchId);
      const list = Array.isArray(res) ? res : res?.members || [];
      const merged = mergeMemberList(list, getStoredMembers());
      setMemberList(merged);
      saveStoredMembers(merged);
    } catch {
      const stored = getStoredMembers();
      if (stored.length > 0) {
        setMemberList(stored);
      } else {
        setError("Failed to load members from backend.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [user]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeGymId = user?.gymId || "65a000000000000000000001";
    const activeBranchId = user?.branchId || "65a000000000000000000002";

    const newMemObj = {
      _id: `mem-${Date.now()}`,
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      planName: formData.planName,
      status: "ACTIVE",
      membershipStartDate: new Date().toISOString(),
      membershipEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const updated = [newMemObj, ...memberList];
    setMemberList(updated);
    saveStoredMembers(updated);
    toast.success(`Member ${formData.fullName} added successfully!`);
    setShowAddModal(false);

    try {
      await memberApi.create(activeGymId, activeBranchId, formData);
      fetchMembers();
    } catch (err) {
      console.warn("Backend add member warning:", err);
    }
  };

  const handleFreeze = async () => {
    if (!selectedMember) return;
    const activeGymId = user?.gymId || "65a000000000000000000001";
    const activeBranchId = user?.branchId || "65a000000000000000000002";
    const targetId = selectedMember.id || selectedMember._id;

    const updated = memberList.map((m) =>
      m._id === targetId || m.id === targetId ? { ...m, status: "FROZEN" } : m
    );
    setMemberList(updated);
    saveStoredMembers(updated);
    toast.success(`Membership for ${selectedMember.fullName || selectedMember.name || "Member"} frozen successfully!`);
    setActiveModalType(null);

    try {
      if (!String(targetId).startsWith("mem-")) {
        await memberApi.freeze(
          activeGymId,
          activeBranchId,
          targetId,
          reason || "Medical break",
          undefined,
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        );
      }
    } catch (err) {
      console.warn("Backend freeze warning:", err);
    }
  };

  const handleExtend = async () => {
    if (!selectedMember) return;
    const activeGymId = user?.gymId || "65a000000000000000000001";
    const activeBranchId = user?.branchId || "65a000000000000000000002";
    const targetId = selectedMember.id || selectedMember._id;

    const updated = memberList.map((m) => {
      if (m._id === targetId || m.id === targetId) {
        const currentEnd = m.membershipEndDate ? new Date(m.membershipEndDate) : new Date();
        const newEnd = new Date(currentEnd.getTime() + extendDays * 24 * 60 * 60 * 1000);
        return { ...m, membershipEndDate: newEnd.toISOString(), status: "ACTIVE" };
      }
      return m;
    });
    setMemberList(updated);
    saveStoredMembers(updated);
    toast.success(`Extended membership by ${extendDays} days!`);
    setActiveModalType(null);

    try {
      if (!String(targetId).startsWith("mem-")) {
        await memberApi.extend(activeGymId, activeBranchId, targetId, extendDays, reason || "Renewal extension");
      }
    } catch (err) {
      console.warn("Backend extend warning:", err);
    }
  };

  const handleCancel = async () => {
    if (!selectedMember) return;
    const activeGymId = user?.gymId || "65a000000000000000000001";
    const activeBranchId = user?.branchId || "65a000000000000000000002";
    const targetId = selectedMember.id || selectedMember._id;

    const updated = memberList.map((m) =>
      m._id === targetId || m.id === targetId ? { ...m, status: "CANCELLED" } : m
    );
    setMemberList(updated);
    saveStoredMembers(updated);
    toast.success(`Membership cancelled.`);
    setActiveModalType(null);

    try {
      if (!String(targetId).startsWith("mem-")) {
        await memberApi.cancel(activeGymId, activeBranchId, targetId, reason || "Member request");
      }
    } catch (err) {
      console.warn("Backend cancel warning:", err);
    }
  };

  const filteredMembers = memberList.filter((m) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const name = (m.name || m.fullName || m.userId?.fullName || "").toLowerCase();
    const email = (m.email || m.userId?.email || "").toLowerCase();
    const phone = (m.phone || m.userId?.phone || "").toLowerCase();
    const plan = (m.planName || m.plan || "").toLowerCase();
    return name.includes(q) || email.includes(q) || phone.includes(q) || plan.includes(q);
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Members"
        subtitle={`${filteredMembers.length} showing · Total active gym members`}
        backTo="/owner"
        action={
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-(--color-accent) text-white text-sm font-medium px-4 py-2 hover:opacity-90 transition-opacity"
          >
            <Plus size={15} /> Add member
          </button>
        }
      />

      <div className="flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface) px-4 py-2 text-sm text-(--color-text) max-w-sm">
        <Search size={15} className="text-(--color-text-faint)" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members by name..."
          className="bg-transparent outline-none w-full placeholder:text-(--color-text-faint)"
        />
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-sm text-(--color-text-muted) gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-(--color-accent)" /> Loading members...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <p className="text-sm text-(--color-danger) mb-3">{error}</p>
            <button
              onClick={fetchMembers}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-full bg-(--color-surface-3) text-(--color-text)"
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <Users className="w-8 h-8 text-(--color-text-faint) mb-2 opacity-50" />
            <p className="text-sm font-medium text-(--color-text)">No gym members registered yet</p>
            <p className="text-xs text-(--color-text-faint) mt-1 max-w-xs">
              Click the "Add member" button above to register your first gym member.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-(--color-border-soft)">
            {filteredMembers.map((m) => {
              const name = m.name || m.fullName || m.userId?.fullName || "Member";
              const plan = m.plan || m.planName || "Monthly Plan";
              const status = m.membershipStatus || m.status || "active";
              const trainerName = m.assignedTrainerId?.userId?.fullName || m.trainer || "Unassigned";
              const initials = name
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .slice(0, 2);

              return (
                <div
                  key={m.id || m._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5 hover:bg-(--color-surface-2)/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--color-surface-3) text-sm font-semibold text-(--color-text)">
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-(--color-text) truncate">{name}</p>
                      <p className="text-xs text-(--color-text-faint)">
                        {plan} · Trainer: {trainerName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    {m.churnRisk === "high" && <Badge tone="danger">Churn risk</Badge>}
                    <Badge tone={statusTone[status] || "good"}>{status}</Badge>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        title="Freeze Membership"
                        onClick={() => {
                          setSelectedMember(m);
                          setActiveModalType("freeze");
                        }}
                        className="p-1.5 rounded-lg border border-(--color-border) text-(--color-text-muted) hover:bg-sky-500/10 hover:text-sky-400 hover:border-sky-500/30"
                      >
                        <Snowflake size={14} />
                      </button>
                      <button
                        title="Extend Membership"
                        onClick={() => {
                          setSelectedMember(m);
                          setActiveModalType("extend");
                        }}
                        className="p-1.5 rounded-lg border border-(--color-border) text-(--color-text-muted) hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30"
                      >
                        <CalendarPlus size={14} />
                      </button>
                      <button
                        title="Cancel Membership"
                        onClick={() => {
                          setSelectedMember(m);
                          setActiveModalType("cancel");
                        }}
                        className="p-1.5 rounded-lg border border-(--color-border) text-(--color-text-muted) hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30"
                      >
                        <XCircle size={14} />
                      </button>
                      <button
                        title="View Profile"
                        onClick={() => {
                          setSelectedMember(m);
                          setActiveModalType("view");
                        }}
                        className="p-1.5 rounded-lg border border-(--color-border) text-(--color-text-muted) hover:bg-(--color-accent-soft) hover:text-(--color-accent-text)"
                      >
                        <User size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-5 w-full max-w-md space-y-4">
            <h3 className="text-base font-semibold text-(--color-text)">Add New Member</h3>
            <form onSubmit={handleAddMember} className="space-y-3">
              <div>
                <label className="text-xs text-(--color-text-muted)">Full Name</label>
                <input
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                  placeholder="e.g. Rahul Sharma"
                />
              </div>
              <div>
                <label className="text-xs text-(--color-text-muted)">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                  placeholder="rahul@example.com"
                />
              </div>
              <div>
                <label className="text-xs text-(--color-text-muted)">Phone Number</label>
                <input
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                  placeholder="+91 9876543210"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-(--color-text-muted) hover:text-(--color-text)"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-full bg-(--color-accent) text-white"
                >
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action Modals */}
      {activeModalType && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-5 w-full max-w-md space-y-4">
            <h3 className="text-base font-semibold text-(--color-text)">
              {activeModalType === "freeze" && "Freeze Membership"}
              {activeModalType === "extend" && "Extend Membership"}
              {activeModalType === "cancel" && "Cancel Membership"}
              {activeModalType === "view" && "Member Profile"}
            </h3>

            {activeModalType === "view" ? (
              <div className="space-y-2 text-sm text-(--color-text)">
                <p><span className="text-(--color-text-muted)">Name:</span> {selectedMember.name || selectedMember.fullName || selectedMember.userId?.fullName}</p>
                <p><span className="text-(--color-text-muted)">Plan:</span> {selectedMember.plan || selectedMember.planName || "Annual Fitness"}</p>
                <p><span className="text-(--color-text-muted)">Status:</span> {selectedMember.membershipStatus || selectedMember.status || "Active"}</p>
                <p><span className="text-(--color-text-muted)">Trainer:</span> {selectedMember.assignedTrainerId?.userId?.fullName || selectedMember.trainer || "Unassigned"}</p>
                <div className="pt-3 flex justify-end">
                  <button
                    onClick={() => setActiveModalType(null)}
                    className="px-4 py-1.5 text-xs rounded-full bg-(--color-surface-3) text-(--color-text)"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {activeModalType === "extend" && (
                  <div>
                    <label className="text-xs text-(--color-text-muted)">Days to Extend</label>
                    <input
                      type="number"
                      value={extendDays}
                      onChange={(e) => setExtendDays(Number(e.target.value))}
                      className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs text-(--color-text-muted)">Reason / Notes</label>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter reason..."
                    className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModalType(null)}
                    className="px-4 py-2 text-xs font-medium text-(--color-text-muted)"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={
                      activeModalType === "freeze"
                        ? handleFreeze
                        : activeModalType === "extend"
                        ? handleExtend
                        : handleCancel
                    }
                    className="px-4 py-2 text-xs font-medium rounded-full bg-(--color-accent) text-white"
                  >
                    Confirm Action
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
