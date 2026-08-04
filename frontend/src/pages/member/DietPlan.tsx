import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";

const meals = [
  { name: "Breakfast", items: "Oats, 4 egg whites, banana", kcal: 420 },
  { name: "Lunch", items: "Grilled chicken, brown rice, salad", kcal: 610 },
  { name: "Pre-workout", items: "Greek yogurt, almonds", kcal: 240 },
  { name: "Dinner", items: "Paneer, roti, sautéed vegetables", kcal: 520 },
];

export default function DietPlan() {
  return (
    <div>
      <PageHeader title="Diet Plan" subtitle="Lean Bulk · 2,700 kcal target" backTo="/member" />

      <Card sweep className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-(--color-text-muted)">Today's intake</p>
          <p className="font-mono text-sm text-(--color-text)">1,790 / 2,700 kcal</p>
        </div>
        <ProgressBar value={1790} max={2700} />
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div>
            <p className="text-sm font-semibold text-(--color-text)">168g</p>
            <p className="text-[10px] text-(--color-text-faint)">Protein</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-(--color-text)">190g</p>
            <p className="text-[10px] text-(--color-text-faint)">Carbs</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-(--color-text)">58g</p>
            <p className="text-[10px] text-(--color-text-faint)">Fat</p>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {meals.map((m) => (
          <Card key={m.name} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-(--color-text)">{m.name}</p>
              <p className="text-xs text-(--color-text-faint) mt-0.5">{m.items}</p>
            </div>
            <span className="font-mono text-xs text-(--color-text-faint)">{m.kcal} kcal</span>
          </Card>
        ))}
      </div>
    </div>
  );
}
