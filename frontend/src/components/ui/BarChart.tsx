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
    <div className="flex items-end gap-3" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
          <div className="w-full flex-1 flex items-end">
            <div
              className="w-full rounded-t-lg transition-[height] duration-700 ease-out"
              style={{
                height: animated ? `${(d.value / max) * 100}%` : "0%",
                backgroundColor: d.color ?? "var(--tone-orange)",
                minHeight: 4,
              }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
          <span className="text-[10px] text-(--color-text-faint) whitespace-nowrap">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
