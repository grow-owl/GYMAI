import { useEffect, useState } from "react";

export interface DonutSegment {
  label: string;
  value: number;
  color: string; // CSS color or var(--tone-x)
}

export default function DonutChart({
  segments,
  size = 148,
  thickness = 18,
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
    const t = setTimeout(() => setAnimated(true), 30);
    return () => clearTimeout(t);
  }, []);

  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let offsetAcc = 0;

  return (
    <div className="flex items-center gap-5 flex-wrap">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-surface-3)"
            strokeWidth={thickness}
          />
          {segments.map((seg) => {
            const fraction = seg.value / total;
            const dash = animated ? fraction * circumference : 0;
            const gap = circumference - dash;
            const rotation = (offsetAcc / total) * 360;
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
                strokeLinecap="round"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: "center",
                  transition: "stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1)",
                }}
              />
            );
          })}
        </svg>
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue && <p className="font-display text-lg font-semibold text-(--color-text)">{centerValue}</p>}
            {centerLabel && <p className="text-[10px] text-(--color-text-faint) text-center px-2">{centerLabel}</p>}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 min-w-[140px]">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-(--color-text-muted) flex-1">{seg.label}</span>
            <span className="text-(--color-text) font-medium tabular-nums">
              {Math.round((seg.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
