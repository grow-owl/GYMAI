import { useState, useEffect } from "react";
import { Plus, DollarSign, Receipt } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import CustomSelect from "@/components/ui/CustomSelect";
import Card from "@/components/ui/Card";
import { expenseApi } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

const mockExpenses = [
  { _id: "1", title: "Staff Salaries", category: "salary", amount: 142000, date: "2026-08-01" },
  { _id: "2", title: "Equipment Maintenance", category: "maintenance", amount: 18500, date: "2026-08-02" },
  { _id: "3", title: "Gym Rent", category: "rent", amount: 65000, date: "2026-08-01" },
  { _id: "4", title: "Electricity & AC Utilities", category: "utilities", amount: 12300, date: "2026-08-03" },
];

export default function Expenses() {
  const user = useAuthStore((s) => s.user);
  const [expenseList, setExpenseList] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newExpense, setNewExpense] = useState({
    title: "",
    category: "utilities",
    amount: 5000,
    notes: "",
  });

  const fetchExpenses = async () => {
    try {
      if (user?.gymId) {
        const res = await expenseApi.list(user.gymId);
        if (Array.isArray(res) && res.length > 0) {
          setExpenseList(res);
          return;
        }
      }
      setExpenseList(mockExpenses);
    } catch {
      setExpenseList(mockExpenses);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [user]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (user?.gymId) {
        await expenseApi.add(user.gymId, newExpense);
      }
      toast.success(`Expense ₹${newExpense.amount} added!`);
      setShowAddModal(false);
      fetchExpenses();
    } catch {
      toast.error("Failed to add expense.");
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
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-(--color-accent) text-white text-sm font-medium px-4 py-2 hover:opacity-90"
          >
            <Plus size={15} /> Add expense
          </button>
        }
      />

      <Card sweep className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-(--color-text-muted) mb-1">Total Expenses This Month</p>
            <p className="font-display text-3xl font-semibold text-rose-400 font-mono">₹{totalExpense.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-full bg-rose-500/10 text-rose-400">
            <DollarSign size={24} />
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-(--color-border-soft)">
          {expenseList.map((e) => (
            <div key={e._id} className="flex items-center justify-between px-4 sm:px-5 py-3.5 hover:bg-(--color-surface-2)/50 transition-colors">
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-(--color-text-muted) shrink-0" />
                <div>
                  <p className="text-sm font-medium text-(--color-text)">{e.title || e.name}</p>
                  <p className="text-xs text-(--color-text-faint) capitalize">{e.category || "General"}</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-(--color-text) font-mono">₹{(e.amount || 0).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-5 w-full max-w-md space-y-4">
            <h3 className="text-base font-semibold text-(--color-text)">Add Expense</h3>
            <form onSubmit={handleAddExpense} className="space-y-3">
              <div>
                <label className="text-xs text-(--color-text-muted)">Expense Title</label>
                <input
                  required
                  value={newExpense.title}
                  onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                  placeholder="e.g. AC Repair"
                />
              </div>
              <div>
                <label className="text-xs text-(--color-text-muted)">Category</label>
                <CustomSelect
                  value={newExpense.category}
                  onChange={(val) => setNewExpense({ ...newExpense, category: val })}
                  className="mt-1"
                  options={[
                    { value: "rent", label: "Rent" },
                    { value: "utilities", label: "Utilities & Electricity" },
                    { value: "salary", label: "Staff Salary" },
                    { value: "maintenance", label: "Equipment Maintenance" },
                    { value: "marketing", label: "Marketing & Ads" },
                  ]}
                />
              </div>
              <div>
                <label className="text-xs text-(--color-text-muted)">Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
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
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
