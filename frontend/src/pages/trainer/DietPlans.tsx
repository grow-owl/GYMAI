import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

const plans = [
  { name: "High Protein Cut", calories: "1,850 kcal", protein: "160g", assigned: 6 },
  { name: "Lean Bulk", calories: "2,700 kcal", protein: "180g", assigned: 4 },
  { name: "Maintenance", calories: "2,200 kcal", protein: "140g", assigned: 9 },
];

export default function DietPlans() {
  return (
    <div>
      <PageHeader title="Diet Plans" subtitle="Calorie & protein targets" backTo="/trainer" />
      <div className="grid sm:grid-cols-2 gap-4">
        {plans.map((p) => (
          <Card key={p.name}>
            <p className="text-sm font-medium text-(--color-text)">{p.name}</p>
            <p className="text-xs text-(--color-text-faint) mt-1">
              {p.calories} · {p.protein} protein · {p.assigned} clients
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
