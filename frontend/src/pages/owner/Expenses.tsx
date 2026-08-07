import { useState, useEffect } from "react";
import { Plus, DollarSign, Receipt, Loader2, RefreshCw, Pencil, Trash2 } from "lucide-react";

import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import CustomSelect from "@/components/ui/CustomSelect";
import Modal from "@/components/ui/Modal";
import { expenseApi } from "@/lib/endpoints";
import { useGymBranch } from "@/hooks/useGymBranch";
import { toast } from "sonner";

const expenseCategoryOptions = [
  { value: "UTILITIES", label: "Electricity & Utilities" },
  { value: "SALARY", label: "Staff Salaries" },
  { value: "RENT", label: "Gym Rent" },
  { value: "MAINTENANCE", label: "Equipment Maintenance" },
  { value: "EQUIPMENT_PURCHASE", label: "Equipment Purchase" },
  { value: "MARKETING", label: "Marketing & Promotions" },
  { value: "OTHER", label: "Other Expense" },
];

export default function Expenses() {
  const { gymId, branchId, loading: resolvingBranch } = useGymBranch();
  const [expenseList, setExpenseList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const [newExpense, setNewExpense] = useState({
    title: "",
    category: "UTILITIES",
    amount: 5000,
    notes: "",
  });

  const [editExpense, setEditExpense] = useState({
    id: "",
    title: "",
    category: "UTILITIES",
    amount: 5000,
    notes: "",
  });

  const fetchExpenses = async () => {
    if (!gymId) {
      setExpenseList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await expenseApi.list(gymId);
      const list = Array.isArray(res) ? res : (res as any)?.expenses || [];
      setExpenseList(list);
    } catch {
      setExpenseList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [gymId, branchId]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeGymId = gymId || "";
    const activeBranchId = branchId || "";

    setSubmittingAdd(true);
    try {
      await expenseApi.add(activeGymId, {
        branchId: activeBranchId,
        description: newExpense.title || "Operating Expense",
        category: newExpense.category,
        amount: Number(newExpense.amount),
        notes: newExpense.notes,
      });
      toast.success(`Expense ₹${newExpense.amount} recorded!`);
      setShowAddModal(false);
      setNewExpense({ title: "", category: "UTILITIES", amount: 5000, notes: "" });
      fetchExpenses();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || err.message || "Failed to add expense.");
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleEditExpense = (e: any) => {
    setEditExpense({
      id: e._id || e.id,
      title: e.description || e.title || e.name || "",
      category: e.category || "UTILITIES",
      amount: e.amount || 0,
      notes: e.notes || "",
    });
    setShowEditModal(true);
  };

  const handleUpdateExpense = async (evt: React.FormEvent) => {
    evt.preventDefault();
    setSubmittingEdit(true);
    try {
      await expenseApi.update(editExpense.id, {
        description: editExpense.title,
        category: editExpense.category,
        amount: Number(editExpense.amount),
        notes: editExpense.notes,
      });
      toast.success("Expense updated successfully!");
      setShowEditModal(false);
      fetchExpenses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to update expense.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteExpense = async (id: string, name: string) => {
    if (!confirm(`Delete expense record "${name}"?`)) return;
    try {
      await expenseApi.delete(id);
      toast.success("Expense deleted.");
      fetchExpenses();
    } catch {
      toast.error("Failed to delete expense.");
    }
  };

  const totalExpense = expenseList.reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Expense Tracker"
        subtitle="Monthly Operating Costs & Expenses"
        backTo="/owner"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchExpenses}
              className="inline-flex items-center gap-1 text-xs text-(--color-text-muted) hover:text-(--color-text) p-2 rounded-lg bg-(--color-surface-2)"
              title="Refresh Expenses"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-(--color-accent)" : ""} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-(--color-accent) text-(--color-navbar) text-sm font-bold px-4 py-2 hover:opacity-90"
            >
              <Plus size={15} /> Add expense
            </button>
          </div>
        }
      />

      <Card sweep className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-(--color-text-muted) mb-1">Total Expenses This Month</p>
            <p className="font-display text-3xl font-semibold text-rose-400 font-mono">₹{totalExpense.toLocaleString("en-IN")}</p>
          </div>
          <div className="p-3 rounded-full bg-rose-500/10 text-rose-400">
            <DollarSign size={24} />
          </div>
        </div>
      </Card>

      {resolvingBranch || loading ? (
        <Card className="flex items-center justify-center p-12 text-sm text-(--color-text-muted) gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-(--color-accent)" /> Loading expense records from backend...
        </Card>
      ) : expenseList.length === 0 ? (
        <Card className="text-center py-12 text-(--color-text-muted) space-y-2">
          <Receipt className="w-8 h-8 mx-auto text-(--color-text-faint)" />
          <p className="text-sm font-medium text-(--color-text)">No expenses recorded for this month</p>
          <p className="text-xs text-(--color-text-muted)">Click "Add expense" to log operational expenses.</p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="divide-y divide-(--color-border-soft)">
            {expenseList.map((e) => (
              <div key={e._id || e.id} className="flex items-center justify-between px-4 sm:px-5 py-3.5 hover:bg-(--color-surface-2)/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Receipt className="w-5 h-5 text-(--color-text-muted) shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-(--color-text)">{e.description || e.title || e.name}</p>
                    <p className="text-xs text-(--color-text-faint) capitalize">{e.category || "General"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm font-bold text-rose-400 mr-1">₹{(e.amount || 0).toLocaleString("en-IN")}</p>
                  <button
                    onClick={() => handleEditExpense(e)}
                    className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-all cursor-pointer"
                    title="Edit Expense"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDeleteExpense(e._id || e.id, e.description || e.title || e.name || "Expense")}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                    title="Delete Expense"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add Expense Modal */}
      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)} maxWidth="md" title="Add Gym Expense">
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-(--color-text-muted) mb-1 font-medium">Expense Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electricity Bill & AC Servicing"
                  value={newExpense.title}
                  onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                  className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border) focus:outline-none focus:border-(--color-accent)"
                />
              </div>

              <div>
                <label className="block text-(--color-text-muted) mb-1 font-medium">Category</label>
                <CustomSelect
                  value={newExpense.category}
                  onChange={(val) => setNewExpense({ ...newExpense, category: val })}
                  options={expenseCategoryOptions}
                />
              </div>

              <div>
                <label className="block text-(--color-text-muted) mb-1 font-medium">Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                  className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border)"
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
                {submittingAdd ? <Loader2 className="w-4 h-4 animate-spin" /> : "Record Expense"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Expense Modal */}
      {showEditModal && (
        <Modal onClose={() => setShowEditModal(false)} maxWidth="md" title="Edit Gym Expense">
          <form onSubmit={handleUpdateExpense} className="space-y-4">
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-(--color-text-muted) mb-1 font-medium font-sans">Expense Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electricity Bill & AC Servicing"
                  value={editExpense.title}
                  onChange={(e) => setEditExpense({ ...editExpense, title: e.target.value })}
                  className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border) focus:outline-none focus:border-(--color-accent)"
                />
              </div>

              <div>
                <label className="block text-(--color-text-muted) mb-1 font-medium font-sans">Category</label>
                <CustomSelect
                  value={editExpense.category}
                  onChange={(val) => setEditExpense({ ...editExpense, category: val })}
                  options={expenseCategoryOptions}
                />
              </div>

              <div>
                <label className="block text-(--color-text-muted) mb-1 font-medium font-sans">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={editExpense.amount}
                  onChange={(e) => setEditExpense({ ...editExpense, amount: Number(e.target.value) })}
                  className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border)"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-(--color-surface-2) text-xs font-semibold text-(--color-text)"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingEdit}
                className="flex-1 py-2.5 rounded-xl bg-(--color-accent) text-(--color-navbar) text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
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
