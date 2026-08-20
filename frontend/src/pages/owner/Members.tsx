import { useState, useEffect } from "react";
import { Search, Plus, Snowflake, CalendarPlus, XCircle, User, Loader2, RefreshCw, Users, KeyRound, Trash2, MoreVertical } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { memberApi, authApi } from "@/lib/endpoints";
import { useGymBranch } from "@/hooks/useGymBranch";
import { useSearchStore } from "../../store/searchStore";
import { useAuthStore } from "@/store/authStore";
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

interface MembersProps {
  overrideGymId?: string;
  overrideBranchId?: string;
  backTo?: string;
}

export default function Members({ overrideGymId, overrideBranchId, backTo: _backTo = "/owner" }: MembersProps = {}) {
  const currentUserRole = useAuthStore((s) => s.user?.role);
  const isOwnerOrAdmin = currentUserRole === "GYM_OWNER" || currentUserRole === "SUPER_ADMIN" || currentUserRole === "BRANCH_MANAGER";
  const { gymId: resolvedGymId, branchId: resolvedBranchId, loading: resolvingBranch } = useGymBranch();
  const gymId = overrideGymId || resolvedGymId;
  const branchId = overrideBranchId || resolvedBranchId;

  const [memberList, setMemberList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { searchQuery: search, setSearchQuery: setSearch } = useSearchStore();


  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [activeModalType, setActiveModalType] = useState<"freeze" | "extend" | "cancel" | "renew" | "view" | null>(null);
  const [activeMobileMenuId, setActiveMobileMenuId] = useState<string | null>(null);

  // Reset Password Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<any | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState("Member@123");
  const [resettingPass, setResettingPass] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "Member@123",
    planName: "Monthly Fitness",
    referralCode: "",
  });
  const [reason, setReason] = useState("");
  const [extendDays, setExtendDays] = useState(30);
  const [renewPlanName, setRenewPlanName] = useState("");
  const [renewEndDate, setRenewEndDate] = useState("");

  const fetchMembers = async () => {
    if (!gymId || !branchId) {
      setMemberList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await memberApi.list(gymId, branchId);
      const list = Array.isArray(res) ? res : res?.members || [];
      setMemberList(list);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load members from server");
      setMemberList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [gymId, branchId]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeGymId = gymId || "";
    const activeBranchId = branchId || "";

    setSubmittingAdd(true);
    try {
      const now = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const payload = {
        ...formData,
        referralCode: formData.referralCode?.trim() || undefined,
        branchId: activeBranchId,
        membershipStartDate: now.toISOString(),
        membershipEndDate: endDate.toISOString(),
      };

      await memberApi.create(activeGymId, activeBranchId, payload);
      toast.success(`Member ${formData.fullName} registered successfully!`);
      setShowAddModal(false);
      setFormData({ fullName: "", email: "", phone: "", password: "Member@123", planName: "Monthly Fitness", referralCode: "" });
      fetchMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || err.message || "Failed to register member");
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleAction = async (type: "freeze" | "extend" | "cancel" | "renew") => {
    if (!selectedMember || !gymId || !branchId) return;
    const mId = selectedMember._id || selectedMember.id;
    try {
      if (type === "freeze") {
        await memberApi.freeze(gymId, branchId, mId, reason || "Member requested freeze");
        toast.success("Membership frozen.");
      } else if (type === "extend") {
        await memberApi.extend(gymId, branchId, mId, Number(extendDays), reason || "Manual extension");
        toast.success(`Membership extended by ${extendDays} days.`);
      } else if (type === "cancel") {
        await memberApi.cancel(gymId, branchId, mId, reason || "Member requested cancellation");
        toast.success("Membership cancelled.");
      } else if (type === "renew") {
        const targetDate = renewEndDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        await memberApi.renew(gymId, branchId, mId, { newEndDate: targetDate, planName: renewPlanName || selectedMember.planName });
        toast.success("Membership renewed successfully!");
      }
      setActiveModalType(null);
      setSelectedMember(null);
      fetchMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || err.message || "Operation failed");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser?._id) return;
    setResettingPass(true);
    try {
      await authApi.adminResetPassword(resetTargetUser._id, newPasswordVal);
      toast.success(`Password reset for ${resetTargetUser.fullName || "member"}!`);
      setShowResetModal(false);
      setResetTargetUser(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || err.message || "Failed to reset password");
    } finally {
      setResettingPass(false);
    }
  };

  const handleDeleteMember = async (mId: string, name: string) => {
    if (!gymId) return;
    if (!confirm(`Are you sure you want to delete member profile for "${name}"?`)) return;
    try {
      await memberApi.deleteMember(gymId, mId);
      toast.success(`Member "${name}" deleted successfully.`);
      fetchMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to delete member.");
    }
  };

  const filteredMembers = memberList.filter((m) => {
    const name = m.fullName || m.name || m.userId?.fullName || "";
    const phone = m.phone || m.userId?.phone || "";
    const qr = m.qrCode || m.qrCodeId || "";
    const q = search.toLowerCase();
    return name.toLowerCase().includes(q) || phone.toLowerCase().includes(q) || qr.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Member Management"
        subtitle="Active Subscriptions & Profiles"
        backTo="/owner"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchMembers}
              className="inline-flex items-center gap-1 text-xs text-(--color-text-muted) hover:text-(--color-text) p-2 rounded-lg bg-(--color-surface-2)"
              title="Refresh Members"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-(--color-accent)" : ""} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-(--color-accent) text-(--color-navbar) text-sm font-bold px-4 py-2 hover:opacity-90 shadow-sm"
            >
              <Plus size={15} /> Add member
            </button>
          </div>
        }
      />

      <Card className="p-3">
        <div className="relative">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-faint)" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone number, or QR ID..."
            className="w-full rounded-xl border border-(--color-border) bg-(--color-base) pl-9 pr-4 py-2 text-sm text-(--color-text) outline-none focus:border-(--color-accent)"
          />
        </div>
      </Card>

      {resolvingBranch || loading ? (
        <Card className="flex items-center justify-center p-12 text-sm text-(--color-text-muted) gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-(--color-accent)" /> Loading member records from backend...
        </Card>
      ) : error ? (
        <Card className="text-center py-8">
          <p className="text-sm text-(--color-danger) mb-3">{error}</p>
          <button
            onClick={fetchMembers}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-full bg-(--color-surface-3) text-(--color-text)"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </Card>
      ) : filteredMembers.length === 0 ? (
        <Card className="text-center py-12 text-(--color-text-muted) space-y-2">
          <Users className="w-8 h-8 mx-auto text-(--color-text-faint)" />
          <p className="text-sm font-medium text-(--color-text)">No members found in database</p>
          <p className="text-xs text-(--color-text-muted)">Click "Add Member" to register a new member account.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredMembers.map((m) => {
            const mId = m._id || m.id;
            const name = m.fullName || m.name || m.userId?.fullName || "Member";
            const plan = m.planName || m.plan || "Monthly Fitness";
            const trainer = m.assignedTrainerId?.userId?.fullName || m.assignedTrainerId?.name || m.trainerName || "Unassigned";
            const status = m.membershipStatus || "ACTIVE";
            const initials = name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase();

            return (
              <Card key={mId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--color-surface-2) font-display text-xs font-bold text-(--color-text)">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-sm font-semibold text-(--color-text) truncate">{name}</p>
                    <p className="text-xs text-(--color-text-muted) truncate mt-0.5">
                      {plan} · Trainer: <span className="font-medium text-(--color-text)">{trainer}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <Badge tone={statusTone[status] || "good"}>{status}</Badge>

                  {/* Desktop / Tablet action buttons */}
                  <div className="hidden sm:flex items-center gap-1">
                    <button
                      onClick={() => {
                        setSelectedMember(m);
                        setActiveModalType("freeze");
                      }}
                      className="p-1.5 rounded-lg hover:bg-(--color-surface-2) text-(--color-text-muted) hover:text-(--color-text)"
                      title="Freeze Membership"
                    >
                      <Snowflake size={15} />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMember(m);
                        setActiveModalType("extend");
                      }}
                      className="p-1.5 rounded-lg hover:bg-(--color-surface-2) text-(--color-text-muted) hover:text-(--color-text)"
                      title="Extend Membership"
                    >
                      <CalendarPlus size={15} />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMember(m);
                        setRenewPlanName(m.planName || m.plan || "Monthly Fitness");
                        const defaultEnd = new Date();
                        defaultEnd.setMonth(defaultEnd.getMonth() + 1);
                        setRenewEndDate(defaultEnd.toISOString().split("T")[0]);
                        setActiveModalType("renew");
                      }}
                      className="p-1.5 rounded-lg hover:bg-(--color-surface-2) text-(--color-text-muted) hover:text-emerald-400"
                      title="Renew Membership"
                    >
                      <RefreshCw size={15} />
                    </button>
                    {isOwnerOrAdmin && (
                      <button
                        onClick={() => {
                          setSelectedMember(m);
                          setActiveModalType("cancel");
                        }}
                        className="p-1.5 rounded-lg hover:bg-(--color-surface-2) text-(--color-text-muted) hover:text-red-400"
                        title="Cancel Membership"
                      >
                        <XCircle size={15} />
                      </button>
                    )}

                    {isOwnerOrAdmin && (
                      <button
                        onClick={() => {
                          setResetTargetUser(m.userId?._id ? m.userId : { _id: m.userId || mId, fullName: name });
                          setShowResetModal(true);
                        }}
                        className="p-1.5 rounded-lg hover:bg-(--color-surface-2) text-amber-400"
                        title="Reset Member Password"
                      >
                        <KeyRound size={15} />
                      </button>
                    )}

                    {isOwnerOrAdmin && (
                      <button
                        onClick={() => handleDeleteMember(mId, name)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 transition-colors cursor-pointer"
                        title="Delete Member Profile"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedMember(m);
                        setActiveModalType("view");
                      }}
                      className="p-1.5 rounded-lg hover:bg-(--color-surface-2) text-(--color-text-muted) hover:text-(--color-text)"
                      title="View Details"
                    >
                      <User size={15} />
                    </button>
                  </div>

                  {/* Mobile action buttons & overflow menu */}
                  <div className="flex sm:hidden items-center gap-1 relative">
                    <button
                      onClick={() => {
                        setSelectedMember(m);
                        setRenewPlanName(m.planName || m.plan || "Monthly Fitness");
                        const defaultEnd = new Date();
                        defaultEnd.setMonth(defaultEnd.getMonth() + 1);
                        setRenewEndDate(defaultEnd.toISOString().split("T")[0]);
                        setActiveModalType("renew");
                      }}
                      className="p-1.5 rounded-lg hover:bg-(--color-surface-2) text-(--color-text-muted) hover:text-emerald-400"
                      title="Renew Membership"
                    >
                      <RefreshCw size={15} />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMember(m);
                        setActiveModalType("view");
                      }}
                      className="p-1.5 rounded-lg hover:bg-(--color-surface-2) text-(--color-text-muted) hover:text-(--color-text)"
                      title="View Details"
                    >
                      <User size={15} />
                    </button>
                    <button
                      onClick={() => setActiveMobileMenuId(activeMobileMenuId === mId ? null : mId)}
                      className="p-1.5 rounded-lg hover:bg-(--color-surface-2) text-(--color-text-muted) hover:text-(--color-text)"
                      title="More Actions"
                    >
                      <MoreVertical size={15} />
                    </button>

                    {activeMobileMenuId === mId && (
                      <div className="absolute right-0 top-full mt-1 w-44 z-30 rounded-xl border border-(--color-border) bg-(--color-surface) shadow-xl p-1">
                        <button
                          onClick={() => {
                            setActiveMobileMenuId(null);
                            setSelectedMember(m);
                            setActiveModalType("freeze");
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-(--color-text) hover:bg-(--color-surface-2) rounded-lg flex items-center gap-2"
                        >
                          <Snowflake size={14} /> Freeze
                        </button>
                        <button
                          onClick={() => {
                            setActiveMobileMenuId(null);
                            setSelectedMember(m);
                            setActiveModalType("extend");
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-(--color-text) hover:bg-(--color-surface-2) rounded-lg flex items-center gap-2"
                        >
                          <CalendarPlus size={14} /> Extend
                        </button>
                        {isOwnerOrAdmin && (
                          <button
                            onClick={() => {
                              setActiveMobileMenuId(null);
                              setSelectedMember(m);
                              setActiveModalType("cancel");
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium text-red-400 hover:bg-(--color-surface-2) rounded-lg flex items-center gap-2"
                          >
                            <XCircle size={14} /> Cancel
                          </button>
                        )}
                        {isOwnerOrAdmin && (
                          <button
                            onClick={() => {
                              setActiveMobileMenuId(null);
                              setResetTargetUser(m.userId?._id ? m.userId : { _id: m.userId || mId, fullName: name });
                              setShowResetModal(true);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium text-amber-400 hover:bg-(--color-surface-2) rounded-lg flex items-center gap-2"
                          >
                            <KeyRound size={14} /> Reset Password
                          </button>
                        )}
                        {isOwnerOrAdmin && (
                          <button
                            onClick={() => {
                              setActiveMobileMenuId(null);
                              handleDeleteMember(mId, name);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-lg flex items-center gap-2"
                          >
                            <Trash2 size={14} /> Delete Profile
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)} maxWidth="md" title="Register New Gym Member">
          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-(--color-text-muted) mb-1 font-medium">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border) focus:outline-none focus:border-(--color-accent)"
                />
              </div>
              <div>
                <label className="block text-(--color-text-muted) mb-1 font-medium">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="rahul@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border) focus:outline-none focus:border-(--color-accent)"
                />
              </div>
              <div>
                <label className="block text-(--color-text-muted) mb-1 font-medium">Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="+91 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border) focus:outline-none focus:border-(--color-accent)"
                />
              </div>
              <div>
                <label className="block text-(--color-text-muted) mb-1 font-medium">Account Password</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Member@123"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border) focus:outline-none focus:border-(--color-accent)"
                />
              </div>
              <div>
                <label className="block text-(--color-text-muted) mb-1 font-medium">Membership Plan</label>
                <input
                  type="text"
                  required
                  value={formData.planName}
                  onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                  className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border) focus:outline-none focus:border-(--color-accent)"
                />
              </div>
              <div>
                <label className="block text-(--color-text-muted) mb-1 font-medium">Referral Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. REF-123456"
                  value={formData.referralCode}
                  onChange={(e) => setFormData({ ...formData, referralCode: e.target.value })}
                  className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border) focus:outline-none focus:border-(--color-accent)"
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
                {submittingAdd ? <Loader2 className="w-4 h-4 animate-spin" /> : "Register Member"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Action Modal (Freeze/Extend/Cancel/View) */}
      {activeModalType && selectedMember && (
        <Modal
          onClose={() => {
            setActiveModalType(null);
            setSelectedMember(null);
          }}
          maxWidth="sm"
          title={`${activeModalType.toUpperCase()} Membership: ${selectedMember.fullName || selectedMember.name || selectedMember.userId?.fullName}`}
        >
          <div className="space-y-4 text-xs">
            {activeModalType === "view" ? (
              <div className="space-y-2 text-(--color-text-muted) bg-(--color-surface-2) p-3 rounded-xl">
                <p><strong className="text-(--color-text)">Email:</strong> {selectedMember.email || selectedMember.userId?.email || "N/A"}</p>
                <p><strong className="text-(--color-text)">Phone:</strong> {selectedMember.phone || selectedMember.userId?.phone || "N/A"}</p>
                <p><strong className="text-(--color-text)">Plan:</strong> {selectedMember.planName || selectedMember.plan}</p>
                <p><strong className="text-(--color-text)">Status:</strong> {selectedMember.membershipStatus || "ACTIVE"}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeModalType === "extend" && (
                  <div>
                    <label className="block text-(--color-text-muted) mb-1 font-medium">Days to Extend</label>
                    <input
                      type="number"
                      value={extendDays}
                      onChange={(e) => setExtendDays(Number(e.target.value))}
                      className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border)"
                    />
                  </div>
                )}

                {activeModalType === "renew" && (
                  <>
                    <div>
                      <label className="block text-(--color-text-muted) mb-1 font-medium">Membership Plan</label>
                      <input
                        type="text"
                        required
                        value={renewPlanName}
                        onChange={(e) => setRenewPlanName(e.target.value)}
                        className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border)"
                      />
                    </div>
                    <div>
                      <label className="block text-(--color-text-muted) mb-1 font-medium">New Expiration Date</label>
                      <input
                        type="date"
                        required
                        value={renewEndDate}
                        onChange={(e) => setRenewEndDate(e.target.value)}
                        className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border)"
                      />
                    </div>
                  </>
                )}

                {activeModalType !== "renew" && (
                  <div>
                    <label className="block text-(--color-text-muted) mb-1 font-medium">Reason / Note</label>
                    <input
                      type="text"
                      placeholder="Enter reason..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border)"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveModalType(null);
                  setSelectedMember(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-(--color-surface-2) font-semibold text-(--color-text)"
              >
                Close
              </button>
              {activeModalType !== "view" && (
                <button
                  type="button"
                  onClick={() => handleAction(activeModalType)}
                  className="flex-1 py-2.5 rounded-xl bg-(--color-accent) text-(--color-navbar) font-bold shadow-md capitalize"
                >
                  Confirm {activeModalType}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Reset Password Modal */}
      {showResetModal && resetTargetUser && (
        <Modal
          onClose={() => setShowResetModal(false)}
          maxWidth="sm"
          title={`Reset Password: ${resetTargetUser.fullName || "Member"}`}
        >
          <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
            <div>
              <label className="block text-(--color-text-muted) mb-1 font-medium">New Password</label>
              <input
                type="text"
                required
                value={newPasswordVal}
                onChange={(e) => setNewPasswordVal(e.target.value)}
                className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border)"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-(--color-surface-2) font-semibold text-(--color-text)"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resettingPass}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-(--color-navbar) font-bold shadow-md flex items-center justify-center gap-1"
              >
                {resettingPass ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reset Password"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
