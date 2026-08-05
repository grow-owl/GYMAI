import { useState, useEffect } from "react";
import { ShieldCheck, Plus, Loader2, RefreshCw, CreditCard, Building2, TrendingUp, Zap, UserPlus, KeyRound } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { paymentApi, authApi } from "@/lib/endpoints";
import { toast } from "sonner";

export default function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [upgradeRequests, setUpgradeRequests] = useState<any[]>([]);

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

  const handleCreateOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingOwner(true);
    try {
      const res = await authApi.registerOwner(ownerFormData);
      toast.success(`Gym Owner created successfully! Gym ID: ${res.gym._id}`);
      setShowCreateOwnerModal(false);
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
      const [analyticsRes, reqsRes] = await Promise.all([
        paymentApi.getPlatformAnalyticsOverview().catch(() => null),
        paymentApi.listUpgradeRequests().catch(() => null),
      ]);
      setAnalytics(analyticsRes);
      const reqList = Array.isArray(reqsRes) ? reqsRes : reqsRes?.upgradeRequests || [];
      setUpgradeRequests(reqList);
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
        transactionRef: formData.transactionRef || undefined,
        notes: formData.notes || undefined,
      });
      toast.success("Manual platform payment recorded successfully! Gym plan updated.");
      setShowRecordModal(false);
      fetchData();
    } catch {
      toast.error("Failed to record manual platform payment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuperAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!superResetTargetId.trim()) {
      toast.error("Please enter a valid User ID");
      return;
    }
    setResettingUserPass(true);
    try {
      await authApi.adminResetPassword(superResetTargetId.trim(), superResetPasswordVal);
      toast.success("User password reset successfully by Super Admin!");
      setShowSuperAdminResetModal(false);
      setSuperResetTargetId("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to reset user password");
    } finally {
      setResettingUserPass(false);
    }
  };

  const handleFulfillRequest = (reqItem: any) => {
    const targetGymId = reqItem.gymId?._id || reqItem.gymId || "";
    setFormData({
      ...formData,
      gymId: String(targetGymId),
      targetPlan: reqItem.requestedPlan || "PRO",
    });
    setShowRecordModal(true);
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
                <p className="text-xs text-(--color-text-muted)">Active Paying Gyms</p>
              </div>
              <p className="font-display text-2xl font-bold text-(--color-text)">
                {analytics?.activePayingGymsCount ?? 0}
              </p>
            </Card>
          </div>

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

          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-faint)">Revenue by Plan</p>
              {analytics?.revenueByPlan && Object.keys(analytics.revenueByPlan).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(analytics.revenueByPlan).map(([plan, amount]) => (
                    <div key={plan} className="flex items-center justify-between p-2.5 rounded-xl bg-(--color-surface-2)">
                      <span className="text-xs font-medium text-(--color-text) uppercase">{plan}</span>
                      <span className="font-mono text-xs font-semibold text-(--color-text)">
                        ₹{Number(amount).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-(--color-text-faint) py-4 text-center">No plan breakdown available</p>
              )}
            </Card>

            <Card className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-faint)">Revenue by Payment Method</p>
              {analytics?.revenueByMethod && Object.keys(analytics.revenueByMethod).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(analytics.revenueByMethod).map(([method, amount]) => (
                    <div key={method} className="flex items-center justify-between p-2.5 rounded-xl bg-(--color-surface-2)">
                      <span className="text-xs font-medium text-(--color-text) uppercase">{method}</span>
                      <span className="font-mono text-xs font-semibold text-(--color-text)">
                        ₹{Number(amount).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-(--color-text-faint) py-4 text-center">No payment method breakdown available</p>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Manual Platform Payment Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-5 w-full max-w-md space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-(--color-accent)" size={20} />
              <h3 className="text-base font-semibold text-(--color-text)">Record Manual Platform Payment</h3>
            </div>
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

              <div>
                <label className="text-xs text-(--color-text-muted)">Target SaaS Plan</label>
                <select
                  value={formData.targetPlan}
                  onChange={(e) => setFormData({ ...formData, targetPlan: e.target.value })}
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                >
                  <option value="BASIC">BASIC</option>
                  <option value="PRO">PRO</option>
                  <option value="ENTERPRISE">ENTERPRISE</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-(--color-text-muted)">Billing Cycle</label>
                <select
                  value={formData.billingCycle}
                  onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                >
                  <option value="MONTHLY">MONTHLY (30 Days)</option>
                  <option value="YEARLY">YEARLY (365 Days)</option>
                </select>
              </div>

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

              <div>
                <label className="text-xs text-(--color-text-muted)">Payment Method</label>
                <select
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>

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
          </div>
        </div>
      )}

      {/* Create Gym Owner Modal (Super Admin Exclusive) */}
      {showCreateOwnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2">
              <UserPlus className="text-(--color-accent)" size={20} />
              <h3 className="text-base font-semibold text-(--color-text)">Provision New Gym Owner & Gym Workspace</h3>
            </div>
            <p className="text-xs text-(--color-text-muted)">
              As Super Admin, create a new Gym Owner user account and provision their initial Gym organization and primary branch.
            </p>
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

              <div>
                <label className="text-xs font-medium text-(--color-text-muted)">SaaS Plan</label>
                <select
                  value={ownerFormData.plan}
                  onChange={(e) => setOwnerFormData({ ...ownerFormData, plan: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                >
                  <option value="TRIAL">TRIAL (14 Days Free)</option>
                  <option value="BASIC">BASIC (Single Branch)</option>
                  <option value="PRO">PRO (Multi Branch)</option>
                  <option value="ENTERPRISE">ENTERPRISE (Custom)</option>
                </select>
              </div>

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
          </div>
        </div>
      )}

      {/* Super Admin Reset Any User Password Modal */}
      {showSuperAdminResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="text-amber-400" size={20} />
              <h3 className="text-base font-semibold text-(--color-text)">Reset Any User Password</h3>
            </div>
            <p className="text-xs text-(--color-text-muted)">
              As Super Admin, reset the password for any Gym Owner, Member, Trainer, or Staff across the platform.
            </p>
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
          </div>
        </div>
      )}
    </div>
  );
}
