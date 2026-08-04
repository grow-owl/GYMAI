import { useState, useEffect } from "react";
import { ShieldCheck, Plus, Loader2, RefreshCw, CreditCard, Building2, TrendingUp } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { paymentApi } from "@/lib/endpoints";
import { toast } from "sonner";

export default function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any | null>(null);

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

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await paymentApi.getPlatformAnalyticsOverview();
      setAnalytics(res);
    } catch {
      setError("Failed to load platform analytics overview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
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
      fetchAnalytics();
    } catch {
      toast.error("Failed to record manual platform payment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="SUPER ADMIN PANEL"
        subtitle="SaaS Platform Revenue & Gym Subscription Management"
        action={
          <button
            onClick={() => setShowRecordModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-(--color-accent) text-white text-sm font-medium px-4 py-2 hover:opacity-90"
          >
            <Plus size={15} /> Record Manual Payment
          </button>
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
            onClick={fetchAnalytics}
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
    </div>
  );
}
