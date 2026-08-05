import { useEffect, useState } from "react";

export interface DonutSegment {
  label: string;
  value: number;
  color: string; // CSS color or var(--tone-x)
}

export default function DonutChart({
  segments,
  size = 160,
  thickness = 20,
  centerLabel,
  centerValue,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 40);
    return () => clearTimeout(t);
  }, []);

  const total = segments.reduce((s, seg) => s + (seg.value || 0), 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  // Filter out 0-value segments for drawing SVG circle segments to prevent dot glitches
  const activeSegments = segments.filter((seg) => seg.value > 0);

  let offsetAcc = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-around gap-6 p-2">
      {/* SVG Donut Visual */}
      <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {/* Background circle track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-surface-2)"
            strokeWidth={thickness}
          />

          {/* Active SVG segments */}
          {activeSegments.map((seg) => {
            const fraction = total > 0 ? seg.value / total : 0;
            const dash = animated ? fraction * circumference : 0;
            const gap = circumference - dash;
            const rotation = total > 0 ? (offsetAcc / total) * 360 : 0;
            offsetAcc += seg.value;

            return (
              <circle
                key={seg.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${gap}`}
                strokeLinecap={activeSegments.length === 1 ? "butt" : "round"}
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: "center",
                  transition: "stroke-dasharray 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />
            );
          })}
        </svg>

        {/* Center Text Stats */}
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
            {centerValue && (
              <span className="font-display text-2xl font-extrabold text-(--color-text) tracking-tight leading-none">
                {centerValue}
              </span>
            )}
            {centerLabel && (
              <span className="text-[11px] font-medium text-(--color-text-muted) uppercase tracking-wider mt-1">
                {centerLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Styled Legend & Breakdown Cards */}
      <div className="flex-1 w-full space-y-2">
        {segments.map((seg) => {
          const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
          return (
            <div
              key={seg.label}
              className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-(--color-surface-2)/60 border border-(--color-border)/40 hover:bg-(--color-surface-2) transition-all"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0 shadow-xs ring-2 ring-white/10"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-xs font-semibold text-(--color-text) truncate">{seg.label}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-(--color-text)">{seg.value}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-(--color-surface-3) text-(--color-text-muted) tabular-nums">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
