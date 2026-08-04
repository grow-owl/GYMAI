import { useState, useEffect } from "react";
import { Plus, Loader2, RefreshCw, CreditCard } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { paymentApi, memberApi } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

export default function Payments() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<{ total: number; transactions: number }>({ total: 0, transactions: 0 });
  const [payments, setPayments] = useState<any[]>([]);
  const [membersList, setMembersList] = useState<any[]>([]);

  // Modal state
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    memberId: "",
    amount: 1500,
    purpose: "membership_fee",
    method: "cash",
    notes: "",
    triggerRenewal: false,
  });

  const fetchData = async () => {
    const activeGymId = user?.gymId || "65a000000000000000000001";
    const activeBranchId = user?.branchId || "65a000000000000000000002";
    setLoading(true);
    setError(null);
    try {
      const [sumRes, payRes, memRes] = await Promise.all([
        paymentApi.getRevenueSummary(activeGymId).catch(() => null),
        paymentApi.listMemberPayments(activeGymId).catch(() => null),
        memberApi.list(activeGymId, activeBranchId).catch(() => []),
      ]);

      if (sumRes?.summary) {
        setSummary({ total: sumRes.summary.total || 0, transactions: sumRes.summary.transactions || 0 });
      }

      const paymentArray = Array.isArray(payRes) ? payRes : payRes?.payments || [];
      setPayments(paymentArray);

      const mList = Array.isArray(memRes) ? memRes : memRes?.members || [];
      setMembersList(mList);
    } catch {
      setError("Failed to load payment data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.gymId) return;
    if (!formData.memberId) {
      toast.error("Please select a member");
      return;
    }
    setSubmitting(true);
    try {
      await paymentApi.recordMemberPayment(user.gymId, {
        ...formData,
        branchId: user.branchId || undefined,
      });
      toast.success("Member payment recorded successfully!");
      setShowRecordModal(false);
      fetchData();
    } catch {
      toast.error("Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payments"
        subtitle="Revenue overview & staff manual payment entry"
        backTo="/owner"
        action={
          <button
            onClick={() => setShowRecordModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-(--color-accent) text-white text-sm font-medium px-4 py-2 hover:opacity-90 transition-opacity"
          >
            <Plus size={15} /> Record Payment
          </button>
        }
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-sm text-(--color-text-muted) gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-(--color-accent)" /> Loading revenue & payments...
        </div>
      ) : error ? (
        <Card className="text-center py-8">
          <p className="text-sm text-(--color-danger) mb-3">{error}</p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-full bg-(--color-surface-3) text-(--color-text) hover:bg-(--color-surface-2)"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </Card>
      ) : (
        <>
          <Card sweep className="mb-4">
            <p className="text-xs text-(--color-text-muted) mb-1">Total Collected Revenue</p>
            <div className="flex items-baseline gap-2">
              <p className="font-display text-3xl font-semibold text-(--color-text)">
                ₹{summary.total.toLocaleString("en-IN")}
              </p>
              <span className="text-sm font-medium text-(--color-good)">
                {summary.transactions} total transaction(s)
              </span>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-(--color-border-soft) flex items-center justify-between">
              <p className="text-xs font-semibold tracking-wide text-(--color-text-faint) uppercase">Recent Member Payments</p>
              <span className="text-xs text-(--color-text-faint)">{payments.length} records</span>
            </div>

            {payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <CreditCard className="w-8 h-8 text-(--color-text-faint) mb-2 opacity-50" />
                <p className="text-sm font-medium text-(--color-text)">No member payments recorded yet</p>
                <p className="text-xs text-(--color-text-faint) mt-1 max-w-xs">
                  Staff members can record offline cash, UPI, or bank transfer payments directly.
                </p>
                <button
                  onClick={() => setShowRecordModal(true)}
                  className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-(--color-accent-text) hover:underline"
                >
                  <Plus size={13} /> Record first payment
                </button>
              </div>
            ) : (
              <div className="divide-y divide-(--color-border-soft)">
                {payments.map((p) => {
                  const memberName = p.memberId?.userId?.fullName || p.memberName || "Member";
                  const amount = p.amount ?? 0;
                  const method = (p.method || "cash").toUpperCase();
                  const purpose = (p.purpose || "membership_fee").replace("_", " ");
                  const dateStr = p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "Recent";

                  return (
                    <div
                      key={p._id || p.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 hover:bg-(--color-surface-2)/50 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-(--color-text)">{memberName}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-(--color-surface-3) text-(--color-text-muted) font-mono uppercase">
                            {p.invoiceNumber}
                          </span>
                        </div>
                        <p className="text-xs text-(--color-text-faint) mt-0.5">
                          {purpose} · Method: {method} · {dateStr}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                        <p className="font-mono text-sm font-semibold text-(--color-text)">
                          ₹{amount.toLocaleString("en-IN")}
                        </p>
                        <Badge tone={p.status === "REFUNDED" ? "danger" : "good"}>
                          {p.status || "SUCCESS"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}

      {/* Manual Payment Recording Form Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-5 w-full max-w-md space-y-4">
            <h3 className="text-base font-semibold text-(--color-text)">Record Manual Member Payment</h3>
            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="text-xs text-(--color-text-muted)">Member</label>
                {membersList.length > 0 ? (
                  <select
                    required
                    value={formData.memberId}
                    onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                    className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                  >
                    <option value="">Select a member...</option>
                    {membersList.map((m) => (
                      <option key={m._id || m.id} value={m._id || m.id}>
                        {m.userId?.fullName || m.fullName || m.name || "Member"} ({m.planName || m.plan || "Plan"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    required
                    value={formData.memberId}
                    onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                    placeholder="Enter Member ID"
                    className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                  />
                )}
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
                <label className="text-xs text-(--color-text-muted)">Payment Purpose</label>
                <select
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                >
                  <option value="membership_fee">Membership Fee</option>
                  <option value="personal_training">Personal Training</option>
                  <option value="merchandise">Merchandise</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-(--color-text-muted)">Payment Method (Manual)</label>
                <select
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card (POS machine)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-(--color-text-muted)">Notes / Reference</label>
                <input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Receipt #1234 or UPI UTR"
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="triggerRenewal"
                  checked={formData.triggerRenewal}
                  onChange={(e) => setFormData({ ...formData, triggerRenewal: e.target.checked })}
                  className="rounded border-(--color-border)"
                />
                <label htmlFor="triggerRenewal" className="text-xs text-(--color-text)">
                  Trigger automatic 1-month membership renewal
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="px-4 py-2 text-xs font-medium text-(--color-text-muted) hover:text-(--color-text)"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-medium rounded-full bg-(--color-accent) text-white disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
