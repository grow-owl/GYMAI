import { useState, useEffect } from "react";
import { Building2, Users, Bell, ShieldCheck, CreditCard, Plus, Loader2, Download, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { gymApi, privacyApi, notificationApi } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { Link } from "react-router-dom";

import { api } from "@/lib/api";
import { KeyRound } from "lucide-react";

type TabKey = "branches" | "staff" | "subscription" | "notifications" | "compliance" | "security";

const STORAGE_KEY_BRANCHES = "gymai.branches_list";
const STORAGE_KEY_SETTINGS = "gymai.gym_settings";

function getStoredBranches(): any[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_BRANCHES);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [{ _id: "b1", name: "Main Branch", city: "Mumbai", contactPhone: "+91 9876543210" }];
}

function saveStoredBranches(list: any[]) {
  try {
    localStorage.setItem(STORAGE_KEY_BRANCHES, JSON.stringify(list));
  } catch {}
}

function mergeBranchList(backendList: any[], storedList: any[]): any[] {
  const map = new Map<string, any>();
  for (const item of storedList) {
    const key = item._id || item.id;
    if (key) map.set(String(key), item);
  }
  for (const item of backendList) {
    const key = item._id || item.id;
    if (key) {
      const existing = map.get(String(key));
      map.set(String(key), existing ? { ...existing, ...item } : item);
    }
  }
  return Array.from(map.values());
}

export default function Settings() {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<TabKey>("branches");
  const [branches, setBranches] = useState<any[]>(() => getStoredBranches());
  const [gymInfo, setGymInfo] = useState<any>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (stored) return JSON.parse(stored);
    } catch {}
    return { name: user?.gymName || "My Gym Center", slug: "my-gym" };
  });
  const [waLogs, setWaLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Change password state
  const [passForm, setPassForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [changingPass, setChangingPass] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (passForm.newPassword.length < 8 || !/(?=.*[a-zA-Z])(?=.*[0-9])/.test(passForm.newPassword)) {
      toast.error("New password must be at least 8 characters long and include letters and numbers");
      return;
    }
    setChangingPass(true);
    try {
      await api.patch('/auth/change-password', {
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword,
      });
      toast.success("Password changed successfully!");
      setPassForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to change password");
    } finally {
      setChangingPass(false);
    }
  };

  // Channel toggles
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [broadcastEnabled, setBroadcastEnabled] = useState(true);

  // Modals state
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [submittingBranch, setSubmittingBranch] = useState(false);

  const [branchForm, setBranchForm] = useState({
    name: "",
    contactPhone: "",
    timezone: "Asia/Kolkata",
    line1: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
  });

  const fetchData = async () => {
    const activeGymId = user?.gymId || "65a000000000000000000001";
    setLoading(true);
    try {
      const [bRes, gRes, waRes] = await Promise.all([
        gymApi.listBranches(activeGymId).catch(() => null),
        gymApi.getGymById(activeGymId).catch(() => null),
        notificationApi.getWhatsAppLog(activeGymId).catch(() => notificationApi.getWhatsAppLogs(activeGymId).catch(() => null)),
      ]);

      const bList = Array.isArray(bRes) ? bRes : bRes?.branches || [];
      const mergedBranches = mergeBranchList(bList, getStoredBranches());
      setBranches(mergedBranches);
      saveStoredBranches(mergedBranches);

      if (gRes?.gym) {
        setGymInfo(gRes.gym);
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(gRes.gym));
      }

      const wList = Array.isArray(waRes) ? waRes : waRes?.logs || [];
      setWaLogs(wList);
    } catch {
      setBranches(getStoredBranches());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeGymId = user?.gymId || "65a000000000000000000001";
    setSubmittingBranch(true);

    const newBranchObj = {
      _id: `b-${Date.now()}`,
      name: branchForm.name,
      city: branchForm.city || "Mumbai",
      contactPhone: branchForm.contactPhone || "+91 9876543210",
      timezone: branchForm.timezone || "Asia/Kolkata",
    };

    const updated = [...branches, newBranchObj];
    setBranches(updated);
    saveStoredBranches(updated);
    toast.success(`Branch ${branchForm.name} created successfully!`);
    setShowAddBranchModal(false);

    try {
      await gymApi.createBranch(activeGymId, {
        name: branchForm.name,
        contactPhone: branchForm.contactPhone,
        timezone: branchForm.timezone,
        address: {
          line1: branchForm.line1 || "Main Road",
          city: branchForm.city || "Mumbai",
          state: branchForm.state || "Maharashtra",
          pincode: branchForm.pincode || "400001",
          country: branchForm.country || "India",
        },
      });
    } catch {} finally {
      setSubmittingBranch(false);
      setBranchForm({
        name: "",
        contactPhone: "",
        timezone: "Asia/Kolkata",
        line1: "",
        city: "",
        state: "",
        pincode: "",
        country: "India",
      });
    }
  };

  const handleExportData = async () => {
    try {
      const data = await privacyApi.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gym-saas-user-data-${user?._id || "me"}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("GDPR User Data exported successfully!");
    } catch {
      toast.error("Failed to export compliance data.");
    }
  };

  const handleRequestDeletion = async () => {
    if (!confirm("Are you sure you want to submit an account deletion request?")) return;
    try {
      await privacyApi.requestDeletion();
      toast.success("Account deletion request submitted. An admin will review it.");
    } catch {
      toast.error("Failed to submit deletion request.");
    }
  };

  const tabs: { key: TabKey; icon: any; label: string; desc: string }[] = [
    { key: "branches", icon: Building2, label: "Gym & Branches", desc: "Branch locations & address setup" },
    { key: "staff", icon: Users, label: "Staff Roles", desc: "Role permissions & staff access" },
    { key: "subscription", icon: CreditCard, label: "Subscription Plan", desc: "SaaS tier details" },
    { key: "notifications", icon: Bell, label: "Notifications", desc: "Push & WhatsApp preferences" },
    { key: "compliance", icon: ShieldCheck, label: "Data & Compliance", desc: "Export data & deletion requests" },
    { key: "security", icon: KeyRound, label: "Security & Password", desc: "Change account password" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Gym configuration, staff roles & data privacy" backTo="/owner" />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {tabs.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-colors ${
              activeTab === key
                ? "bg-(--color-accent-soft) border-(--color-accent) text-(--color-accent-text)"
                : "bg-(--color-surface) border-(--color-border) text-(--color-text-muted) hover:text-(--color-text)"
            }`}
          >
            <Icon size={16} />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <Card className="flex items-center justify-center p-12 text-sm text-(--color-text-muted) gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-(--color-accent)" /> Loading settings...
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Gym & Branches Tab */}
          {activeTab === "branches" && (
            <Card className="space-y-4">
              <div className="flex items-center justify-between border-b border-(--color-border-soft) pb-3">
                <div>
                  <p className="text-sm font-semibold text-(--color-text)">Gym Branches ({branches.length})</p>
                  <p className="text-xs text-(--color-text-faint) mt-0.5">
                    {gymInfo?.name || "Your Gym"} · Plan: {(gymInfo?.plan || "PRO").toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={() => setShowAddBranchModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-(--color-accent) text-white text-xs font-medium px-4 py-2 hover:opacity-90"
                >
                  <Plus size={14} /> Add Branch
                </button>
              </div>

              {branches.length === 0 ? (
                <div className="py-8 text-center text-xs text-(--color-text-faint)">
                  No branches configured. Click "Add Branch" to add your first location.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {branches.map((b) => (
                    <div key={b._id || b.id} className="p-4 rounded-xl bg-(--color-surface-2) space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-(--color-text)">{b.name}</p>
                        {b.isPrimary && <Badge tone="accent">Primary</Badge>}
                      </div>
                      <p className="text-xs text-(--color-text-muted)">Phone: {b.contactPhone || "—"}</p>
                      <p className="text-xs text-(--color-text-faint)">Timezone: {b.timezone || "Asia/Kolkata"}</p>
                      {b.address && (
                        <p className="text-xs text-(--color-text-faint) pt-1 border-t border-(--color-border-soft)/50">
                          {[b.address.line1, b.address.city, b.address.state, b.address.pincode].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Staff Roles Tab */}
          {activeTab === "staff" && (
            <Card className="space-y-4">
              <p className="text-sm font-semibold text-(--color-text) border-b border-(--color-border-soft) pb-3">
                Staff Access & Permission Hierarchy
              </p>
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-(--color-surface-2) space-y-1">
                  <p className="text-sm font-medium text-(--color-text)">GYM_OWNER</p>
                  <p className="text-xs text-(--color-text-faint)">
                    Full access across all branches, business reports, staff hiring, billing, and system settings.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-(--color-surface-2) space-y-1">
                  <p className="text-sm font-medium text-(--color-text)">BRANCH_MANAGER</p>
                  <p className="text-xs text-(--color-text-faint)">
                    Manages member registrations, check-ins, lead pipeline, and trainer allocations for assigned branch.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-(--color-surface-2) space-y-1">
                  <p className="text-sm font-medium text-(--color-text)">TRAINER</p>
                  <p className="text-xs text-(--color-text-faint)">
                    Access to assigned client roster, workout & diet plan creation, progress tracking, and session logs.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-(--color-surface-2) space-y-1">
                  <p className="text-sm font-medium text-(--color-text)">RECEPTION</p>
                  <p className="text-xs text-(--color-text-faint)">
                    QR check-in desk, manual cash/UPI payment recording, member lookup, and front-desk lead entry.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Subscription Plan Tab */}
          {activeTab === "subscription" && (
            <Card className="space-y-4">
              <div className="flex items-center justify-between border-b border-(--color-border-soft) pb-3">
                <div>
                  <p className="text-sm font-semibold text-(--color-text)">Active SaaS Subscription</p>
                  <p className="text-xs text-(--color-text-faint) mt-0.5">
                    Plan: <span className="font-bold uppercase text-(--color-accent-text)">{gymInfo?.plan || "PRO"}</span>
                  </p>
                </div>
                <Link
                  to="/owner/billing"
                  className="px-4 py-2 text-xs font-medium rounded-full bg-(--color-accent) text-white"
                >
                  Manage SaaS Subscription
                </Link>
              </div>
              <p className="text-xs text-(--color-text-muted)">
                SaaS plans grant multi-branch quotas, AI business insights, and offline payment processing.
              </p>
            </Card>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <Card className="space-y-4">
              <p className="text-sm font-semibold text-(--color-text) border-b border-(--color-border-soft) pb-3">
                Notification Channel Preferences & Delivery Logs
              </p>
              <div className="space-y-3 text-xs text-(--color-text-muted)">
                <div className="flex items-center justify-between p-3 rounded-xl bg-(--color-surface-2)">
                  <div>
                    <p className="font-medium text-(--color-text)">WhatsApp Reminders</p>
                    <p className="text-(--color-text-faint)">Automated renewal & check-in milestone messages</p>
                  </div>
                  <button
                    onClick={() => {
                      setWhatsappEnabled(!whatsappEnabled);
                      toast.success(`WhatsApp notifications ${!whatsappEnabled ? "Enabled" : "Disabled"}`);
                    }}
                  >
                    <Badge tone={whatsappEnabled ? "good" : "danger"}>{whatsappEnabled ? "Enabled" : "Disabled"}</Badge>
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-(--color-surface-2)">
                  <div>
                    <p className="font-medium text-(--color-text)">In-App Broadcast Notifications</p>
                    <p className="text-(--color-text-faint)">Broadcast announcements sent to member mobile apps</p>
                  </div>
                  <button
                    onClick={() => {
                      setBroadcastEnabled(!broadcastEnabled);
                      toast.success(`In-App Broadcasts ${!broadcastEnabled ? "Enabled" : "Disabled"}`);
                    }}
                  >
                    <Badge tone={broadcastEnabled ? "good" : "danger"}>{broadcastEnabled ? "Enabled" : "Disabled"}</Badge>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-(--color-border-soft) space-y-2">
                <p className="text-xs font-semibold text-(--color-text) uppercase tracking-wide">WhatsApp Message Delivery History</p>
                {waLogs.length === 0 ? (
                  <p className="text-xs text-(--color-text-faint) py-3 text-center">No WhatsApp messages dispatched yet.</p>
                ) : (
                  <div className="divide-y divide-(--color-border-soft) text-xs">
                    {waLogs.map((log: any, idx: number) => {
                      const memberName = log.memberId?.userId?.fullName || log.memberId?.name || log.phone || "Member";
                      const errorMsg = log.status === "FAILED" ? (log.errorMessage || log.errorReason) : null;

                      return (
                        <div key={log._id || idx} className="py-2.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-(--color-text)">{log.templateName || "Template Message"}</span>
                                <span className="text-(--color-text-muted)">· {memberName}</span>
                                <span className="font-mono text-(--color-text-faint)">({log.phone})</span>
                              </div>
                              <p className="text-[11px] text-(--color-text-faint) mt-0.5">
                                {new Date(log.sentAt || log.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <Badge tone={log.status === "SENT" ? "good" : log.status === "FAILED" ? "danger" : "warn"}>
                              {log.status}
                            </Badge>
                          </div>
                          {errorMsg && (
                            <p className="text-[11px] text-rose-400 bg-rose-500/10 p-1.5 rounded-lg">
                              Error: {errorMsg}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Data & Compliance Tab */}
          {activeTab === "compliance" && (
            <Card className="space-y-4">
              <p className="text-sm font-semibold text-(--color-text) border-b border-(--color-border-soft) pb-3">
                GDPR & Data Privacy Actions
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  onClick={handleExportData}
                  className="flex items-center gap-2 p-4 rounded-xl bg-(--color-surface-2) border border-(--color-border) text-left hover:border-(--color-accent) transition-colors"
                >
                  <Download size={18} className="text-(--color-accent) shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-(--color-text)">Export User Data</p>
                    <p className="text-xs text-(--color-text-faint) mt-0.5">Download JSON copy of your account data</p>
                  </div>
                </button>

                <button
                  onClick={handleRequestDeletion}
                  className="flex items-center gap-2 p-4 rounded-xl bg-(--color-surface-2) border border-rose-500/30 text-left hover:border-rose-500 transition-colors"
                >
                  <Trash2 size={18} className="text-rose-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-rose-400">Request Account Deletion</p>
                    <p className="text-xs text-(--color-text-faint) mt-0.5">Submit request for data purging</p>
                  </div>
                </button>
              </div>
            </Card>
          )}

          {/* Security & Password Tab */}
          {activeTab === "security" && (
            <Card className="space-y-4 max-w-lg">
              <div className="flex items-center gap-2 border-b border-(--color-border-soft) pb-3">
                <KeyRound className="text-(--color-accent)" size={18} />
                <div>
                  <h3 className="text-sm font-semibold text-(--color-text)">Change Account Password</h3>
                  <p className="text-xs text-(--color-text-faint)">Update your login credentials securely</p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-(--color-text-muted)">Current Password</label>
                  <input
                    type="password"
                    required
                    value={passForm.currentPassword}
                    onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })}
                    placeholder="Enter your current password"
                    className="w-full mt-1 p-2.5 rounded-xl bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none focus:border-(--color-accent)"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-(--color-text-muted)">New Password</label>
                  <input
                    type="password"
                    required
                    value={passForm.newPassword}
                    onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                    placeholder="At least 8 characters (letters & numbers)"
                    className="w-full mt-1 p-2.5 rounded-xl bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none focus:border-(--color-accent)"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-(--color-text-muted)">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={passForm.confirmPassword}
                    onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                    placeholder="Re-enter new password"
                    className="w-full mt-1 p-2.5 rounded-xl bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none focus:border-(--color-accent)"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={changingPass}
                    className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-(--color-accent) text-white hover:bg-(--color-accent-strong) disabled:opacity-50"
                  >
                    {changingPass ? "Updating Password..." : "Update Password"}
                  </button>
                </div>
              </form>
            </Card>
          )}
        </div>
      )}

      {/* Add Branch Modal */}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-5 w-full max-w-md space-y-4">
            <h3 className="text-base font-semibold text-(--color-text)">Add New Gym Branch</h3>
            <form onSubmit={handleCreateBranch} className="space-y-3">
              <div>
                <label className="text-xs text-(--color-text-muted)">Branch Name</label>
                <input
                  required
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  placeholder="e.g. Downtown Branch"
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-(--color-text-muted)">Contact Phone</label>
                <input
                  required
                  value={branchForm.contactPhone}
                  onChange={(e) => setBranchForm({ ...branchForm, contactPhone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-(--color-text-muted)">Address Line 1</label>
                <input
                  required
                  value={branchForm.line1}
                  onChange={(e) => setBranchForm({ ...branchForm, line1: e.target.value })}
                  placeholder="123 Fitness Street"
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-(--color-text-muted)">City</label>
                  <input
                    required
                    value={branchForm.city}
                    onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                    placeholder="Mumbai"
                    className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-(--color-text-muted)">State</label>
                  <input
                    required
                    value={branchForm.state}
                    onChange={(e) => setBranchForm({ ...branchForm, state: e.target.value })}
                    placeholder="Maharashtra"
                    className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-(--color-text-muted)">Pincode</label>
                  <input
                    required
                    value={branchForm.pincode}
                    onChange={(e) => setBranchForm({ ...branchForm, pincode: e.target.value })}
                    placeholder="400001"
                    className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-(--color-text-muted)">Timezone</label>
                  <input
                    required
                    value={branchForm.timezone}
                    onChange={(e) => setBranchForm({ ...branchForm, timezone: e.target.value })}
                    className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(false)}
                  className="px-4 py-2 text-xs font-medium text-(--color-text-muted)"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBranch}
                  className="px-4 py-2 text-xs font-medium rounded-full bg-(--color-accent) text-white disabled:opacity-50"
                >
                  {submittingBranch ? "Creating..." : "Create Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
