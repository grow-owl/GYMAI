import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { pushDayExercises } from "@/data/mock";
import clsx from "clsx";

export default function WorkoutTracking() {
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [exercises, setExercises] = useState(pushDayExercises);
  const [resting, setResting] = useState(false);
  const [seconds, setSeconds] = useState(90);

  const exercise = exercises[exerciseIndex];

  useEffect(() => {
    if (!resting) return;
    if (seconds <= 0) {
      setResting(false);
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resting, seconds]);

  const toggleSet = (setIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i !== exerciseIndex
          ? ex
          : { ...ex, sets: ex.sets.map((s, j) => (j === setIdx ? { ...s, done: !s.done } : s)) }
      )
    );
    setResting(true);
    setSeconds(90);
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div>
      <PageHeader
        title="Push Day"
        subtitle={`Exercise ${exerciseIndex + 1} / ${exercises.length}`}
        backTo="/member/workout-plan"
      />

      <Card sweep className="mb-4">
        <p className="font-display text-lg font-semibold tracking-wide text-(--color-text) uppercase">{exercise.name}</p>
        <p className="text-xs text-(--color-text-faint) mt-1">Previous: {exercise.previous}</p>

        <div className="mt-5">
          <div className="grid grid-cols-4 text-[11px] text-(--color-text-faint) uppercase tracking-wide px-1 mb-2">
            <span>Set</span>
            <span>Kg</span>
            <span>Reps</span>
            <span className="text-right">Done</span>
          </div>
          <div className="space-y-2">
            {exercise.sets.map((s, idx) => (
              <button
                key={s.set}
                onClick={() => toggleSet(idx)}
                className={clsx(
                  "grid grid-cols-4 items-center w-full rounded-xl px-3 py-2.5 text-sm font-mono transition-colors",
                  s.done ? "bg-(--color-accent-soft) text-(--color-text)" : "bg-(--color-surface-2) text-(--color-text-muted)"
                )}
              >
                <span>{s.set}</span>
                <span>{s.kg}</span>
                <span>{s.reps}</span>
                <span className="flex justify-end">
                  <span
                    className={clsx(
                      "flex h-5 w-5 items-center justify-center rounded-full border",
                      s.done ? "bg-(--color-accent) border-(--color-accent) text-white" : "border-(--color-border)"
                    )}
                  >
                    {s.done && <Check size={12} strokeWidth={3} />}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="text-center mb-4">
        <p className="text-xs text-(--color-text-faint) uppercase tracking-wide mb-2">
          {resting ? "Rest Timer" : "Ready"}
        </p>
        <p className="font-mono text-4xl font-semibold text-(--color-text) tabular-nums">
          {mm}:{ss}
        </p>
      </Card>

      <div className="flex gap-3">
        <button
          disabled={exerciseIndex === 0}
          onClick={() => setExerciseIndex((i) => Math.max(0, i - 1))}
          className="flex-1 rounded-full border border-(--color-border) text-(--color-text-muted) text-sm font-medium py-3 disabled:opacity-40"
        >
          Previous
        </button>
        <button
          disabled={exerciseIndex === exercises.length - 1}
          onClick={() => setExerciseIndex((i) => Math.min(exercises.length - 1, i + 1))}
          className="flex-1 rounded-full bg-(--color-accent) text-white text-sm font-semibold py-3 disabled:opacity-40"
        >
          Next exercise
        </button>
      </div>
    </div>
  );
}
