import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

const week = [
  { day: "Mon", name: "Push Day", focus: "Chest • Shoulder • Triceps", active: true },
  { day: "Tue", name: "Pull Day", focus: "Back • Biceps" },
  { day: "Wed", name: "Leg Day", focus: "Quads • Hamstrings • Glutes" },
  { day: "Thu", name: "Rest", focus: "Active recovery" },
  { day: "Fri", name: "Push Day", focus: "Chest • Shoulder • Triceps" },
  { day: "Sat", name: "Pull Day", focus: "Back • Biceps" },
  { day: "Sun", name: "Rest", focus: "Full recovery" },
];

export default function WorkoutPlan() {
  return (
    <div>
      <PageHeader title="Workout Plan" subtitle="Push / Pull / Legs · Intermediate" backTo="/member" />
      <div className="space-y-3">
        {week.map((d) => (
          <Card
            key={d.day}
            className={d.active ? "border-(--color-accent)/40 bg-(--color-accent-soft)" : undefined}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs w-9 shrink-0 text-(--color-text-faint)">{d.day}</span>
                <div>
                  <p className="text-sm font-medium text-(--color-text)">{d.name}</p>
                  <p className="text-xs text-(--color-text-faint)">{d.focus}</p>
                </div>
              </div>
              {d.name !== "Rest" && (
                <Link to="/member/workout-tracking" className="text-(--color-text-faint)">
                  <ChevronRight size={16} />
                </Link>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
