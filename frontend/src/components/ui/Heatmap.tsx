import clsx from "clsx";

export interface HeatmapCell {
  label: string;
  value: number; // 0-4 intensity, or raw value if max provided
}

const levelClasses = [
  "bg-(--color-surface-3)",
  "bg-(--tone-orange)/25",
  "bg-(--tone-orange)/50",
  "bg-(--tone-orange)/75",
  "bg-(--tone-orange)",
];

export default function Heatmap({
  weeks,
  dayLabels = ["S", "M", "T", "W", "T", "F", "S"],
  max,
}: {
  weeks: HeatmapCell[][]; // array of weeks, each week = 7 cells
  dayLabels?: string[];
  max?: number;
}) {
  const flatMax = max ?? Math.max(1, ...weeks.flat().map((c) => c.value));

  const levelFor = (value: number) => {
    if (value <= 0) return 0;
    const ratio = value / flatMax;
    if (ratio > 0.75) return 4;
    if (ratio > 0.5) return 3;
    if (ratio > 0.25) return 2;
    return 1;
  };

  return (
    <div className="flex gap-3">
      <div className="flex flex-col gap-1 shrink-0">
        {dayLabels.map((d, i) => (
          <span key={i} className="h-3.5 w-4 text-[9px] text-(--color-text-faint) flex items-center">
            {d}
          </span>
        ))}
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((cell, di) => (
              <div
                key={di}
                title={`${cell.label}: ${cell.value}`}
                className={clsx(
                  "h-3.5 w-3.5 rounded-[3px] transition-transform hover:scale-125",
                  levelClasses[levelFor(cell.value)]
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
