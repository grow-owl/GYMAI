import { useState } from "react";
import clsx from "clsx";

export interface HeatmapCell {
  label: string;
  value: number; // 0-4 intensity, or raw value if max provided
  date?: string;
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
  dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  max,
}: {
  weeks: HeatmapCell[][]; // array of weeks, each week = 7 cells
  dayLabels?: string[];
  max?: number;
}) {
  const [hoveredCell, setHoveredCell] = useState<{ label: string; value: number } | null>(null);
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
    <div className="w-full space-y-2">
      {/* Top info bar showing hovered date and value */}
      <div className="flex items-center justify-between text-xs h-5">
        <span className="text-(--color-text-faint) font-medium">
          {hoveredCell ? (
            <span className="text-(--color-text) font-semibold">
              {hoveredCell.label}: <span className="text-(--tone-orange)">{hoveredCell.value} check-ins</span>
            </span>
          ) : (
            "Hover over any cell to view daily check-in count & date"
          )}
        </span>
        <span className="text-[10px] text-(--color-text-faint)">14-week activity</span>
      </div>

      <div className="w-full flex gap-3 items-stretch">
        {/* Day labels column */}
        <div className="flex flex-col justify-between py-0.5 shrink-0">
          {dayLabels.map((d, i) => (
            <span key={i} className="text-[10px] font-medium text-(--color-text-faint) flex items-center h-3.5 sm:h-4">
              {d.slice(0, 3)}
            </span>
          ))}
        </div>

        {/* Full-width responsive 14-week grid */}
        <div className="flex-1 grid grid-cols-14 gap-1 sm:gap-2 w-full">
          {weeks.map((week, wi) => {
            const firstCellDate = week[0]?.date || `W${wi + 1}`;
            return (
              <div key={wi} className="flex flex-col justify-between items-center gap-1 w-full">
                {week.map((cell, di) => (
                  <div
                    key={di}
                    onMouseEnter={() => setHoveredCell({ label: cell.label, value: cell.value })}
                    onMouseLeave={() => setHoveredCell(null)}
                    title={`${cell.label}: ${cell.value} check-ins`}
                    className={clsx(
                      "w-full aspect-square rounded-[3px] transition-all cursor-pointer hover:scale-125 hover:z-10",
                      levelClasses[levelFor(cell.value)]
                    )}
                  />
                ))}
                <span className="text-[9px] text-(--color-text-faint) mt-1 truncate max-w-full">
                  {wi % 3 === 0 ? firstCellDate : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
