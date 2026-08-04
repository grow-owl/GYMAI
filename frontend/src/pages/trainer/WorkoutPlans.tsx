import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

const plans = [
  { name: "Push / Pull / Legs", assigned: 12, level: "Intermediate" },
  { name: "Fat Loss Circuit", assigned: 8, level: "Beginner" },
  { name: "Strength Foundations", assigned: 5, level: "Beginner" },
  { name: "Advanced Hypertrophy", assigned: 4, level: "Advanced" },
];

export default function WorkoutPlans() {
  return (
    <div>
      <PageHeader title="Workout Plans" subtitle="Create, duplicate, and assign plans" backTo="/trainer" />
      <div className="grid sm:grid-cols-2 gap-4">
        {plans.map((p) => (
          <Card key={p.name}>
            <p className="text-sm font-medium text-(--color-text)">{p.name}</p>
            <p className="text-xs text-(--color-text-faint) mt-1">{p.level} · {p.assigned} clients assigned</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
