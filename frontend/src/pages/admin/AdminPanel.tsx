import { useState, useEffect } from "react";
import { Plus, Loader2, RefreshCw, CreditCard, Building2, TrendingUp, Zap, UserPlus, KeyRound, Copy, Check } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import CustomSelect from "@/components/ui/CustomSelect";
import { paymentApi, authApi, gymApi } from "@/lib/endpoints";
import { toast } from "sonner";

export default function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [upgradeRequests, setUpgradeRequests] = useState<any[]>([]);
  const [gymsList, setGymsList] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Newly Provisioned Gym Modal State
  const [createdGymDetails, setCreatedGymDetails] = useState<any | null>(null);

  // Manual Platform Payment Modal
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    gymId: "",
    targetPlan: "PRO",
    billingCycle: "MONTHLY",
    amount: 4999,
    method: "bank_transfer",
    transactionRef: "",
    notes: "",
  });

  // Super Admin Password Reset Modal
  const [showSuperAdminResetModal, setShowSuperAdminResetModal] = useState(false);
  const [superResetTargetId, setSuperResetTargetId] = useState("");
  const [superResetPasswordVal, setSuperResetPasswordVal] = useState("Owner@123");
  const [resettingUserPass, setResettingUserPass] = useState(false);

  // Create Gym Owner Modal
  const [showCreateOwnerModal, setShowCreateOwnerModal] = useState(false);
  const [submittingOwner, setSubmittingOwner] = useState(false);
  const [ownerFormData, setOwnerFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    gymName: "",
    branchName: "Main Branch",
    plan: "PRO",
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingOwner(true);
    try {
      const res = await authApi.registerOwner(ownerFormData);
      toast.success(`Gym Owner created! Gym ID: ${res.gym?._id || res.gym?.id}`);
      setShowCreateOwnerModal(false);
      
      setCreatedGymDetails({
        gymName: ownerFormData.gymName,
        gymId: res.gym?._id || res.gym?.id,
        branchName: ownerFormData.branchName,
        branchId: res.primaryBranch?._id || res.primaryBranch?.id,
        ownerName: ownerFormData.fullName,
        ownerEmail: ownerFormData.email,
        ownerPhone: ownerFormData.phone,
        password: ownerFormData.password,
        plan: ownerFormData.plan,
      });

      setOwnerFormData({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        gymName: "",
        branchName: "Main Branch",
        plan: "PRO",
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to create Gym Owner account");
    } finally {
      setSubmittingOwner(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsRes, reqsRes, gymsRes] = await Promise.all([
        paymentApi.getPlatformAnalyticsOverview().catch(() => null),
        paymentApi.listUpgradeRequests().catch(() => null),
        gymApi.listAllGyms().catch(() => null),
      ]);
      setAnalytics(analyticsRes);
      const reqList = Array.isArray(reqsRes) ? reqsRes : reqsRes?.upgradeRequests || [];
      setUpgradeRequests(reqList);

      const gList = Array.isArray(gymsRes) ? gymsRes : gymsRes?.gyms || [];
      setGymsList(gList);
    } catch {
      setError("Failed to load platform analytics overview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.gymId.trim()) {
      toast.error("Please enter a Gym ID");
      return;
    }
    setSubmitting(true);
    try {
      await paymentApi.recordManualPlatformPayment(formData.gymId.trim(), {
        targetPlan: formData.targetPlan,
        billingCycle: formData.billingCycle,
        amount: Number(formData.amount),
        method: formData.method,
        transactionRef: formData.transactionRef.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });
      toast.success("Manual platform SaaS payment recorded!");
      setShowRecordModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFulfillRequest = async (reqItem: any) => {
    const gymId = reqItem.gymId?._id || reqItem.gymId;
    setFormData((prev) => ({
      ...prev,
      gymId: gymId ? String(gymId) : "",
      targetPlan: reqItem.requestedPlan || "PRO",
    }));
    setShowRecordModal(true);
  };

  const handleSuperAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!superResetTargetId.trim()) {
      toast.error("User ID is required");
      return;
    }
    setResettingUserPass(true);
    try {
      await authApi.adminResetPassword(superResetTargetId.trim(), superResetPasswordVal.trim());
      toast.success("User password reset successfully!");
      setShowSuperAdminResetModal(false);
      setSuperResetTargetId("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to reset password");
    } finally {
      setResettingUserPass(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="SUPER ADMIN PANEL"
        subtitle="SaaS Platform Revenue & Gym Subscription Management"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateOwnerModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-(--color-accent) text-white text-sm font-medium px-4 py-2 hover:opacity-90 shadow-sm"
            >
              <UserPlus size={15} /> Create Gym Owner
            </button>
            <button
              onClick={() => setShowSuperAdminResetModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium px-4 py-2 hover:bg-amber-500/20"
            >
              <KeyRound size={15} /> Reset Any User Password
            </button>
            <button
              onClick={() => setShowRecordModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-(--color-surface-2) border border-(--color-border) text-(--color-text) text-sm font-medium px-4 py-2 hover:bg-(--color-surface-3)"
            >
              <Plus size={15} /> Record Manual Payment
            </button>
          </div>
        }
      />

      {loading ? (
        <Card className="flex items-center justify-center p-12 text-sm text-(--color-text-muted) gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-(--color-accent)" /> Loading platform analytics...
        </Card>
      ) : error ? (
        <Card className="text-center py-8">
          <p className="text-sm text-(--color-danger) mb-3">{error}</p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-full bg-(--color-surface-3) text-(--color-text)"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Card sweep>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-emerald-400" />
                <p className="text-xs text-(--color-text-muted)">Total SaaS Revenue</p>
              </div>
              <p className="font-display text-2xl font-bold text-(--color-text)">
                ₹{(analytics?.totalRevenue ?? 0).toLocaleString("en-IN")}
              </p>
            </Card>

            <Card>
              <div className="flex items-center gap-2 mb-1">
                <CreditCard size={16} className="text-sky-400" />
                <p className="text-xs text-(--color-text-muted)">Revenue This Month</p>
              </div>
              <p className="font-display text-2xl font-bold text-(--color-text)">
                ₹{(analytics?.revenueThisMonth ?? 0).toLocaleString("en-IN")}
              </p>
            </Card>

            <Card>
              <div className="flex items-center gap-2 mb-1">
                <Building2 size={16} className="text-amber-400" />
                <p className="text-xs text-(--color-text-muted)">Active Registered Gyms</p>
              </div>
              <p className="font-display text-2xl font-bold text-(--color-text)">
                {gymsList.length || analytics?.activePayingGymsCount || 0}
              </p>
            </Card>
          </div>

          {/* Registered Gym Organizations & Unique Tenant IDs */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between border-b border-(--color-border-soft) pb-2">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-(--color-accent)" />
                <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-faint)">
                  Registered Gym Organizations & Unique Tenant IDs ({gymsList.length})
                </p>
              </div>
              <button
                onClick={fetchData}
                className="text-xs text-(--color-text-muted) hover:text-(--color-text) flex items-center gap-1"
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            {gymsList.length === 0 ? (
              <p className="text-xs text-(--color-text-faint) py-4 text-center">No gym organizations registered yet.</p>
            ) : (
              <div className="divide-y divide-(--color-border-soft) text-xs">
                {gymsList.map((gItem: any) => {
                  const gId = String(gItem._id || gItem.id);
                  const ownerName = gItem.owner?.fullName || gItem.owner?.email || "Gym Owner";
                  const ownerContact = gItem.owner?.phone || gItem.owner?.email || "";
                  const branches = gItem.branches || [];

                  return (
                    <div key={gId} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-(--color-text)">{gItem.name}</span>
                          <Badge tone="good">{gItem.plan || "PRO"}</Badge>
                        </div>
                        <p className="text-(--color-text-muted)">
                          Owner: <strong className="text-(--color-text)">{ownerName}</strong> {ownerContact ? `(${ownerContact})` : ""}
                        </p>
                        
                        {/* Gym & Branch ID Displays */}
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono">
                          <div className="flex items-center gap-1.5 bg-(--color-surface-2) px-2.5 py-1 rounded-lg border border-white/5">
                            <span className="text-(--color-text-faint)">Gym ID:</span>
                            <span className="text-amber-400 font-bold">{gId}</span>
                            <button
                              onClick={() => copyToClipboard(gId, "Gym ID")}
                              className="ml-1 text-(--color-text-muted) hover:text-(--color-accent)"
                              title="Copy Gym ID"
                            >
                              {copiedId === gId ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                            </button>
                          </div>

                          {branches.map((b: any) => {
                            const bId = String(b._id || b.id);
                            return (
                              <div key={bId} className="flex items-center gap-1.5 bg-(--color-surface-2) px-2.5 py-1 rounded-lg border border-white/5">
                                <span className="text-(--color-text-faint)">Branch ({b.name || "Main"}):</span>
                                <span className="text-indigo-400 font-bold">{bId}</span>
                                <button
                                  onClick={() => copyToClipboard(bId, "Branch ID")}
                                  className="ml-1 text-(--color-text-muted) hover:text-(--color-accent)"
                                  title="Copy Branch ID"
                                >
                                  {copiedId === bId ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleFulfillRequest({ gymId: gId, requestedPlan: gItem.plan })}
                          className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-(--color-surface-2) border border-(--color-border) text-(--color-text) hover:bg-(--color-surface-3)"
                        >
                          Record Payment
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Pending Upgrade Requests Section */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between border-b border-(--color-border-soft) pb-2">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-(--color-accent)" />
                <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-faint)">
                  Pending Upgrade Requests ({upgradeRequests.length})
                </p>
              </div>
            </div>

            {upgradeRequests.length === 0 ? (
              <p className="text-xs text-(--color-text-faint) py-4 text-center">No pending gym upgrade requests.</p>
            ) : (
              <div className="divide-y divide-(--color-border-soft) text-xs">
                {upgradeRequests.map((reqItem: any, idx: number) => {
                  const gymName = reqItem.gymId?.name || "Gym Organization";
                  const reqUser = reqItem.requestedByUserId?.fullName || reqItem.requestedByUserId?.email || "Gym Owner";
                  return (
                    <div key={reqItem._id || idx} className="py-3 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-(--color-text)">{gymName}</span>
                          <Badge tone={reqItem.status === "PENDING" ? "warn" : "good"}>{reqItem.status}</Badge>
                        </div>
                        <p className="text-(--color-text-muted)">
                          Requested Plan: <strong className="text-(--color-text)">{reqItem.requestedPlan}</strong> (from {reqItem.currentPlan})
                        </p>
                        <p className="text-[11px] text-(--color-text-faint)">
                          Requested by {reqUser} · {new Date(reqItem.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <button
                        onClick={() => handleFulfillRequest(reqItem)}
                        className="px-3 py-1.5 text-xs font-medium rounded-full bg-(--color-accent) text-white hover:opacity-90"
                      >
                        Record Payment
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Newly Provisioned Gym Credentials Modal */}
      {createdGymDetails && (
        <Modal
          onClose={() => setCreatedGymDetails(null)}
          maxWidth="md"
          title="Gym Owner Workspace Provisioned Successfully!"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-1">
              <p className="font-bold text-sm">✓ Account & Gym Organization Created</p>
              <p className="text-xs">Give these unique IDs and login details to the Gym Owner.</p>
            </div>

            <div className="space-y-2 bg-(--color-surface-2) p-4 rounded-xl border border-white/5 font-mono">
              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <span className="text-(--color-text-muted)">Gym Name:</span>
                <span className="font-bold text-(--color-text)">{createdGymDetails.gymName}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <span className="text-(--color-text-muted)">Unique Gym ID:</span>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-amber-400">{createdGymDetails.gymId}</span>
                  <button
                    onClick={() => copyToClipboard(createdGymDetails.gymId, "Gym ID")}
                    className="text-(--color-text-muted) hover:text-(--color-accent)"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>
              {createdGymDetails.branchId && (
                <div className="flex justify-between items-center pb-2 border-b border-white/10">
                  <span className="text-(--color-text-muted)">Main Branch ID:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-indigo-400">{createdGymDetails.branchId}</span>
                    <button
                      onClick={() => copyToClipboard(createdGymDetails.branchId, "Branch ID")}
                      className="text-(--color-text-muted) hover:text-(--color-accent)"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <span className="text-(--color-text-muted)">Owner Email:</span>
                <span className="font-bold text-(--color-text)">{createdGymDetails.ownerEmail}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-(--color-text-muted)">Initial Password:</span>
                <span className="font-bold text-amber-400">{createdGymDetails.password}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const summary = `Gym Name: ${createdGymDetails.gymName}\nGym ID: ${createdGymDetails.gymId}\nBranch ID: ${createdGymDetails.branchId}\nOwner Email: ${createdGymDetails.ownerEmail}\nPassword: ${createdGymDetails.password}`;
                  copyToClipboard(summary, "Gym Owner Credentials & IDs");
                }}
                className="py-2.5 px-4 rounded-xl bg-(--color-accent) text-white font-bold shadow-md flex items-center gap-1.5"
              >
                <Copy size={14} /> Copy All Details
              </button>
              <button
                type="button"
                onClick={() => setCreatedGymDetails(null)}
                className="py-2.5 px-4 rounded-xl bg-(--color-surface-2) font-semibold text-(--color-text)"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Manual Platform Payment Modal */}
      {showRecordModal && (
        <Modal onClose={() => setShowRecordModal(false)} maxWidth="md" title="Record Manual Platform Payment">
          <form onSubmit={handleRecordPayment} className="space-y-3">
            <div>
              <label className="text-xs text-(--color-text-muted)">Gym ID (MongoDB ObjectId)</label>
              <input
                required
                value={formData.gymId}
                onChange={(e) => setFormData({ ...formData, gymId: e.target.value })}
                placeholder="e.g. 64f1a2b3c4d5e6f7a8b9c0d1"
                className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none font-mono"
              />
            </div>

            <CustomSelect
              label="Target SaaS Plan"
              value={formData.targetPlan}
              onChange={(v) => setFormData({ ...formData, targetPlan: v })}
              options={[
                { value: "BASIC", label: "BASIC" },
                { value: "PRO", label: "PRO" },
                { value: "ENTERPRISE", label: "ENTERPRISE" },
              ]}
            />

            <CustomSelect
              label="Billing Cycle"
              value={formData.billingCycle}
              onChange={(v) => setFormData({ ...formData, billingCycle: v })}
              options={[
                { value: "MONTHLY", label: "MONTHLY (30 Days)" },
                { value: "YEARLY", label: "YEARLY (365 Days)" },
              ]}
            />

            <div>
              <label className="text-xs text-(--color-text-muted)">Amount (₹)</label>
              <input
                type="number"
                required
                min={1}
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
              />
            </div>

            <CustomSelect
              label="Payment Method"
              value={formData.method}
              onChange={(v) => setFormData({ ...formData, method: v })}
              options={[
                { value: "bank_transfer", label: "Bank Transfer" },
                { value: "upi", label: "UPI" },
                { value: "cash", label: "Cash" },
                { value: "cheque", label: "Cheque" },
                { value: "other", label: "Other" },
              ]}
            />

            <div>
              <label className="text-xs text-(--color-text-muted)">Transaction Ref / UTR (Optional)</label>
              <input
                value={formData.transactionRef}
                onChange={(e) => setFormData({ ...formData, transactionRef: e.target.value })}
                placeholder="e.g. UTR-99887766"
                className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setShowRecordModal(false)}
                className="px-4 py-2 text-xs font-medium text-(--color-text-muted)"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-xs font-medium rounded-full bg-(--color-accent) text-white disabled:opacity-50"
              >
                {submitting ? "Processing..." : "Record SaaS Payment"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create Gym Owner Modal (Super Admin Exclusive) */}
      {showCreateOwnerModal && (
        <Modal
          onClose={() => setShowCreateOwnerModal(false)}
          maxWidth="lg"
          title="Provision New Gym Owner & Gym Workspace"
          subtitle="As Super Admin, create a new Gym Owner user account and provision their initial Gym organization and primary branch."
        >
          <form onSubmit={handleCreateOwner} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-(--color-text-muted)">Owner Full Name</label>
                <input
                  required
                  value={ownerFormData.fullName}
                  onChange={(e) => setOwnerFormData({ ...ownerFormData, fullName: e.target.value })}
                  placeholder="e.g. Vikram Sharma"
                  className="w-full mt-1 p-2.5 rounded-xl bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none focus:border-(--color-accent)"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-(--color-text-muted)">Phone Number</label>
                <input
                  required
                  value={ownerFormData.phone}
                  onChange={(e) => setOwnerFormData({ ...ownerFormData, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="w-full mt-1 p-2.5 rounded-xl bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none focus:border-(--color-accent)"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-(--color-text-muted)">Owner Email Address</label>
              <input
                type="email"
                required
                value={ownerFormData.email}
                onChange={(e) => setOwnerFormData({ ...ownerFormData, email: e.target.value })}
                placeholder="owner@gym.com"
                className="w-full mt-1 p-2.5 rounded-xl bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none focus:border-(--color-accent)"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-(--color-text-muted)">Initial Password</label>
              <input
                type="password"
                required
                value={ownerFormData.password}
                onChange={(e) => setOwnerFormData({ ...ownerFormData, password: e.target.value })}
                placeholder="At least 8 chars (letters & numbers)"
                className="w-full mt-1 p-2.5 rounded-xl bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none focus:border-(--color-accent)"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3 border-t border-(--color-border-soft) pt-3">
              <div>
                <label className="text-xs font-medium text-(--color-text-muted)">Gym Name</label>
                <input
                  required
                  value={ownerFormData.gymName}
                  onChange={(e) => setOwnerFormData({ ...ownerFormData, gymName: e.target.value })}
                  placeholder="e.g. Apex Fitness Club"
                  className="w-full mt-1 p-2.5 rounded-xl bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none focus:border-(--color-accent)"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-(--color-text-muted)">Main Branch Name</label>
                <input
                  value={ownerFormData.branchName}
                  onChange={(e) => setOwnerFormData({ ...ownerFormData, branchName: e.target.value })}
                  placeholder="Main Branch"
                  className="w-full mt-1 p-2.5 rounded-xl bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none focus:border-(--color-accent)"
                />
              </div>
            </div>

            <CustomSelect
              label="SaaS Plan"
              value={ownerFormData.plan}
              onChange={(v) => setOwnerFormData({ ...ownerFormData, plan: v })}
              options={[
                { value: "TRIAL", label: "TRIAL (14 Days Free)" },
                { value: "BASIC", label: "BASIC (Single Branch)" },
                { value: "PRO", label: "PRO (Multi Branch)" },
                { value: "ENTERPRISE", label: "ENTERPRISE (Custom)" },
              ]}
            />

            <div className="flex justify-end gap-2 pt-4 border-t border-(--color-border-soft)">
              <button
                type="button"
                onClick={() => setShowCreateOwnerModal(false)}
                className="px-4 py-2 text-xs font-medium text-(--color-text-muted) hover:text-(--color-text)"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingOwner}
                className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-(--color-accent) text-white hover:bg-(--color-accent-strong) disabled:opacity-50"
              >
                {submittingOwner ? "Creating Gym Owner..." : "Create Gym Owner & Gym"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Super Admin Reset Any User Password Modal */}
      {showSuperAdminResetModal && (
        <Modal
          onClose={() => setShowSuperAdminResetModal(false)}
          maxWidth="md"
          title="Reset Any User Password"
          subtitle="As Super Admin, reset the password for any Gym Owner, Member, Trainer, or Staff across the platform."
        >
          <form onSubmit={handleSuperAdminResetPassword} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-(--color-text-muted)">Target User ID (MongoDB ObjectId)</label>
              <input
                required
                value={superResetTargetId}
                onChange={(e) => setSuperResetTargetId(e.target.value)}
                placeholder="e.g. 65a000000000000000000001"
                className="w-full mt-1 p-2.5 rounded-xl bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none font-mono focus:border-(--color-accent)"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-(--color-text-muted)">New Password</label>
                <button
                  type="button"
                  onClick={() => setSuperResetPasswordVal(`Owner@${Math.floor(1000 + Math.random() * 9000)}`)}
                  className="text-[11px] text-(--color-accent-text) hover:underline"
                >
                  Auto-generate
                </button>
              </div>
              <input
                type="text"
                required
                value={superResetPasswordVal}
                onChange={(e) => setSuperResetPasswordVal(e.target.value)}
                placeholder="Min 8 chars (letters & numbers)"
                className="w-full mt-1 p-2.5 rounded-xl bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none font-mono focus:border-(--color-accent)"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-(--color-border-soft)">
              <button
                type="button"
                onClick={() => setShowSuperAdminResetModal(false)}
                className="px-4 py-2 text-xs font-medium text-(--color-text-muted) hover:text-(--color-text)"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resettingUserPass}
                className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-amber-500 text-black font-semibold hover:bg-amber-400 disabled:opacity-50"
              >
                {resettingUserPass ? "Resetting Password..." : "Reset User Password"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
