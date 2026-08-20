import { useEffect, useState } from "react";

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

export default function BarChart({ data, height = 120 }: { data: BarDatum[]; height?: number }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 30);
    return () => clearTimeout(t);
  }, []);

  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="flex items-end gap-2.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end min-w-0">
          <span className="text-[10px] font-bold text-(--color-text) shrink-0">{d.value}</span>
          <div className="w-full flex-1 flex items-end">
            <div
              className="w-full rounded-t-lg transition-[height] duration-700 ease-out"
              style={{
                height: animated ? `${(d.value / max) * 100}%` : "0%",
                backgroundColor: d.color ?? "var(--color-accent)",
                minHeight: 4,
              }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
          <span className="text-[10px] font-medium text-(--color-text-faint) truncate w-full text-center" title={d.label}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}
