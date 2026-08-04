import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

const expenses = [
  { name: "Staff Salaries", value: "₹1,42,000" },
  { name: "Equipment Maintenance", value: "₹18,500" },
  { name: "Rent", value: "₹65,000" },
  { name: "Utilities", value: "₹12,300" },
];

export default function Expenses() {
  return (
    <div>
      <PageHeader title="Expenses" subtitle="This month" backTo="/owner" />
      <Card sweep className="mb-4">
        <p className="text-xs text-(--color-text-muted) mb-1">Net profit</p>
        <p className="font-display text-3xl font-semibold text-(--color-good)">₹1,44,650</p>
        <p className="text-xs text-(--color-text-faint) mt-1">Revenue ₹3.82L − Expenses ₹2.38L</p>
      </Card>
      <div className="space-y-3">
        {expenses.map((e) => (
          <Card key={e.name} className="flex items-center justify-between">
            <p className="text-sm text-(--color-text)">{e.name}</p>
            <p className="text-sm font-medium text-(--color-text) font-mono">{e.value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
