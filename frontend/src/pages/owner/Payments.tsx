import { useState, useEffect } from "react";
import { Plus, Loader2, RefreshCw, CreditCard, Pencil, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import CustomSelect from "@/components/ui/CustomSelect";
import Modal from "@/components/ui/Modal";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { paymentApi, memberApi } from "@/lib/endpoints";
import { useGymBranch } from "@/hooks/useGymBranch";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

const paymentMethodOptions = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI / QR Code" },
  { value: "card", label: "Credit / Debit Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
];

const purposeOptions = [
  { value: "membership_fee", label: "Membership Fee" },
  { value: "personal_training", label: "Personal Training Pack" },
  { value: "merchandise", label: "Store / Supplement Purchase" },
  { value: "other", label: "Other Payment" },
];

export default function Payments() {
  const currentUserRole = useAuthStore((s) => s.user?.role);
  const isOwnerOrAdmin =
    currentUserRole === "GYM_OWNER" ||
    currentUserRole === "SUPER_ADMIN" ||
    currentUserRole === "BRANCH_MANAGER";
  const { gymId, branchId, loading: resolvingBranch } = useGymBranch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [payments, setPayments] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ total: number; transactions: number }>({ total: 0, transactions: 0 });
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

  const [showEditModal, setShowEditModal] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editData, setEditData] = useState({
    paymentId: "",
    amount: 1500,
    purpose: "membership_fee",
    method: "cash",
    notes: "",
  });

  const fetchData = async () => {
    const activeGymId = gymId || "";
    const activeBranchId = branchId || "";
    if (!activeGymId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [sumRes, payRes, memRes] = await Promise.all([
        paymentApi.getRevenueSummary(activeGymId).catch(() => null),
        paymentApi.listMemberPayments(activeGymId).catch(() => null),
        memberApi.list(activeGymId, activeBranchId).catch(() => null),
      ]);

      const paymentArray = Array.isArray(payRes) ? payRes : payRes?.payments || [];
      setPayments(paymentArray);

      const totalRevenue = sumRes?.summary?.total || paymentArray.reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);
      const totalCount = sumRes?.summary?.transactions || paymentArray.length;
      setSummary({ total: totalRevenue, transactions: totalCount });

      let mList = Array.isArray(memRes) ? memRes : memRes?.members || [];
      // Fallback: if branch-specific members empty, try fetching all members
      if (mList.length === 0) {
        const fallbackRes = await memberApi.list(activeGymId, "").catch(() => null);
        mList = Array.isArray(fallbackRes) ? fallbackRes : fallbackRes?.members || [];
      }

      setMembersList(mList);
      if (mList.length > 0 && !formData.memberId) {
        const firstId = mList[0]._id || mList[0].id;
        setFormData((prev) => ({ ...prev, memberId: String(firstId) }));
      }
    } catch {
      setError("Failed to load payments from backend.");
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleSync = () => {
      fetchData();
    };

    window.addEventListener("gymai-payments-updated", handleSync);
    return () => {
      window.removeEventListener("gymai-payments-updated", handleSync);
    };
  }, [gymId, branchId]);

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeGymId = gymId || "";
    const activeBranchId = branchId || "";
    if (!formData.memberId) {
      toast.error("Please select a valid member.");
      return;
    }
    setSubmitting(true);
    try {
      await paymentApi.recordMemberPayment(activeGymId, {
        memberId: formData.memberId,
        branchId: activeBranchId,
        amount: Number(formData.amount),
        purpose: formData.purpose,
        method: formData.method,
        notes: formData.notes,
        triggerRenewal: formData.triggerRenewal,
      });
      toast.success("Payment recorded successfully!");
      setShowRecordModal(false);
      setFormData({ memberId: membersList[0]?._id || "", amount: 1500, purpose: "membership_fee", method: "cash", notes: "", triggerRenewal: false });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPayment = (p: any) => {
    setEditData({
      paymentId: p._id || p.id,
      amount: p.amount || 0,
      purpose: p.purpose || "membership_fee",
      method: p.method || p.paymentMethod || "cash",
      notes: p.notes || "",
    });
    setShowEditModal(true);
  };

  const handleUpdatePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeGymId = gymId || "";
    if (!editData.paymentId) return;
    setSubmittingEdit(true);
    try {
      await paymentApi.update(activeGymId, editData.paymentId, {
        amount: Number(editData.amount),
        purpose: editData.purpose,
        method: editData.method,
        notes: editData.notes,
      });
      toast.success("Payment transaction updated!");
      setShowEditModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to update payment");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeletePayment = async (pId: string, name: string) => {
    const activeGymId = gymId || "";
    if (!confirm(`Are you sure you want to delete payment record for "${name}"?`)) return;
    try {
      await paymentApi.delete(activeGymId, pId);
      toast.success("Payment record deleted.");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to delete payment");
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Member Payments"
        subtitle="Revenue Collections & Invoices"
        backTo="/owner"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-1 text-xs text-(--color-text-muted) hover:text-(--color-text) p-2 rounded-lg bg-(--color-surface-2)"
              title="Refresh Payments"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-(--color-accent)" : ""} />
            </button>
            <button
              onClick={() => {
                if (membersList.length > 0 && !formData.memberId) {
                  const firstId = membersList[0]._id || membersList[0].id;
                  setFormData((prev) => ({ ...prev, memberId: String(firstId) }));
                }
                setShowRecordModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-(--color-accent) text-white text-sm font-medium px-4 py-2 hover:opacity-90 shadow-sm"
            >
              <Plus size={15} /> Record payment
            </button>
          </div>
        }
      />

      {isOwnerOrAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card sweep>
            <p className="text-xs text-(--color-text-muted) mb-1">Total Revenue Collected</p>
            <p className="font-display text-2xl font-bold text-emerald-400 font-mono">
              ₹{summary.total.toLocaleString("en-IN")}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-(--color-text-muted) mb-1">Successful Payment Transactions</p>
            <p className="font-display text-2xl font-bold text-(--color-text) font-mono">{summary.transactions} payments</p>
          </Card>
        </div>
      )}

      {resolvingBranch || loading ? (
        <Card className="flex items-center justify-center p-12 text-sm text-(--color-text-muted) gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-(--color-accent)" /> Loading payment ledger from backend...
        </Card>
      ) : error ? (
        <Card className="text-center py-8">
          <p className="text-sm text-(--color-danger) mb-3">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 rounded-full bg-(--color-surface-2) text-xs font-semibold">
            Retry Loading
          </button>
        </Card>
      ) : !isOwnerOrAdmin ? (
        <Card className="text-center py-12 text-(--color-text-muted) space-y-2">
          <CreditCard className="w-8 h-8 mx-auto text-(--color-text-faint)" />
          <p className="text-sm font-medium text-(--color-text)">Reception Payment Terminal</p>
          <p className="text-xs text-(--color-text-muted)">Click "Record payment" to log member cash, card, or UPI payments.</p>
        </Card>
      ) : payments.length === 0 ? (
        <Card className="text-center py-12 text-(--color-text-muted) space-y-2">
          <CreditCard className="w-8 h-8 mx-auto text-(--color-text-faint)" />
          <p className="text-sm font-medium text-(--color-text)">No member payments recorded yet</p>
          <p className="text-xs text-(--color-text-muted)">Click "Record payment" to log member cash/UPI payments.</p>
        </Card>
      ) : (
        <Card className="p-4">
          <div className="space-y-3">
            {payments.map((p) => {
              const pId = p._id || p.id;
              const rawName =
                p.customerName ||
                (p.memberId?.fullName && p.memberId.fullName !== "N/A" && p.memberId.fullName !== "Walk-in Customer" ? p.memberId.fullName : undefined) ||
                p.memberId?.userId?.fullName ||
                p.memberName ||
                p.user?.fullName;

              const memberName =
                !rawName || rawName === "N/A" || rawName === "Member" || rawName === "Walk-in Customer"
                  ? "Walk-in Customer"
                  : rawName;

              const description =
                p.notes ||
                p.description ||
                (p.purpose === "merchandise"
                  ? "Store / Product Purchase"
                  : p.purpose === "membership_fee"
                  ? "Membership Fee"
                  : p.purpose === "personal_training"
                  ? "Personal Training Pack"
                  : p.purpose?.replace(/_/g, " ") || "Payment");

              return (
                <div key={pId} className="p-3.5 rounded-xl border border-(--color-border) bg-(--color-surface-2)/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                  <div>
                    <h4 className="font-display text-sm font-semibold text-(--color-text)">{memberName}</h4>
                    <p className="text-xs text-(--color-text-muted) mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-(--color-text)">{description}</span>
                      <span>·</span>
                      <span className="uppercase text-(--color-text-faint) font-mono">{p.method || p.paymentMethod || "CASH"}</span>
                      {p.invoiceNumber && <span className="text-[10px] text-(--color-accent) font-mono font-semibold">[{p.invoiceNumber}]</span>}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-(--color-border)/30">
                    <Badge tone="good">{p.status || "SUCCESS"}</Badge>
                    <span className="font-mono text-sm font-bold text-emerald-400 mr-1">₹{(p.amount || 0).toLocaleString("en-IN")}</span>
                    {isOwnerOrAdmin && (
                      <>
                        <button
                          onClick={() => handleEditPayment(p)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-amber-400 transition-colors cursor-pointer"
                          title="Edit Payment"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDeletePayment(pId, memberName)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 transition-colors cursor-pointer"
                          title="Delete Payment"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Record Payment Modal */}
      {showRecordModal && (
        <Modal onClose={() => setShowRecordModal(false)} maxWidth="md" title="Record Member Payment">
          <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs">
            <div>
              <CustomSelect
                label="Select Member"
                placeholder="Choose a gym member..."
                options={membersList.map((m) => {
                  const mId = m._id || m.id;
                  const name = m.fullName || m.name || m.userId?.fullName || "Member";
                  const phone = m.phone || m.userId?.phone || "";
                  return { label: `${name} ${phone ? `(${phone})` : ""}`, value: String(mId) };
                })}
                value={formData.memberId}
                onChange={(val) => setFormData({ ...formData, memberId: val })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-(--color-text-muted) mb-1 font-medium">Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border)"
                />
              </div>

              <div>
                <CustomSelect
                  label="Payment Method"
                  options={paymentMethodOptions}
                  value={formData.method}
                  onChange={(val) => setFormData({ ...formData, method: val })}
                />
              </div>
            </div>

            <div>
              <CustomSelect
                label="Purpose"
                options={purposeOptions}
                value={formData.purpose}
                onChange={(val) => setFormData({ ...formData, purpose: val })}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRecordModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-(--color-surface-2) font-semibold text-(--color-text)"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-(--color-accent) text-white font-bold shadow-md flex items-center justify-center gap-1.5"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Record Payment"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Payment Modal */}
      {showEditModal && (
        <Modal onClose={() => setShowEditModal(false)} maxWidth="md" title="Edit Member Payment Transaction">
          <form onSubmit={handleUpdatePaymentSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-(--color-text-muted) mb-1 font-medium font-sans">Payment Amount (₹)</label>
              <input
                type="number"
                required
                min={0}
                value={editData.amount}
                onChange={(e) => setEditData({ ...editData, amount: Number(e.target.value) })}
                className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border)"
              />
            </div>

            <div>
              <CustomSelect
                label="Payment Method"
                options={paymentMethodOptions}
                value={editData.method}
                onChange={(val) => setEditData({ ...editData, method: val })}
              />
            </div>

            <div>
              <CustomSelect
                label="Purpose"
                options={purposeOptions}
                value={editData.purpose}
                onChange={(val) => setEditData({ ...editData, purpose: val })}
              />
            </div>

            <div>
              <label className="block text-(--color-text-muted) mb-1 font-medium font-sans">Notes / Internal Reference</label>
              <input
                type="text"
                placeholder="Notes or reference..."
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border)"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-(--color-surface-2) font-semibold text-(--color-text)"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingEdit}
                className="flex-1 py-2.5 rounded-xl bg-(--color-accent) text-white font-bold shadow-md flex items-center justify-center gap-1.5"
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
