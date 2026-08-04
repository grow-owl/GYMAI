import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { attendanceToday } from "@/data/mock";

export default function Attendance() {
  const [secondsLeft, setSecondsLeft] = useState(21);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((value) => (value <= 1 ? 21 : value - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const qrBlocks = useMemo(
    () => [
      [1, 1, 0, 1, 0, 1, 1, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 1, 1],
      [0, 1, 1, 1, 0, 1, 0, 1, 0],
      [1, 0, 1, 0, 1, 1, 0, 0, 1],
      [1, 1, 0, 1, 1, 0, 1, 0, 1],
      [0, 1, 1, 0, 1, 0, 1, 1, 0],
      [1, 0, 1, 1, 0, 1, 1, 0, 1],
      [1, 1, 0, 1, 0, 0, 1, 1, 0],
      [0, 1, 1, 0, 1, 1, 0, 1, 1],
    ],
    []
  );

  return (
    <div className="space-y-5 max-w-4xl mx-auto w-full">
      <PageHeader title="ATTENDANCE" />

      <div className="flex justify-center">
        <Card className="w-full max-w-md border-(--color-border) px-6 py-8 sm:px-8 sm:py-10 text-center">
          <p className="text-[11px] font-semibold tracking-[0.28em] text-(--color-text-faint) uppercase">Reception display</p>
          <p className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-(--color-text)">SCAN TO CHECK IN / OUT</p>
          <p className="mt-3 text-sm text-(--color-text-muted)">
            This QR code refreshes automatically for security. Members scan it from the member app.
          </p>

          <div className="mx-auto mt-8 w-full max-w-[18rem] rounded-2xl border border-(--color-border) bg-(--color-surface) p-5 shadow-sm">
            <div className="mx-auto grid w-full aspect-square max-w-[13rem] grid-cols-9 gap-1.5 p-2">
              {qrBlocks.map((row, rowIndex) =>
                row.map((cell, cellIndex) => (
                  <span
                    key={`${rowIndex}-${cellIndex}`}
                    className={cell ? "rounded-[2px] bg-black" : "rounded-[2px] bg-transparent"}
                  />
                ))
              )}
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 text-sm text-(--color-text-muted)">
              <RefreshCw size={15} className="text-(--color-accent)" />
              <span className="font-mono">Refreshes in</span>
              <span className="font-semibold text-(--color-accent-text)">{secondsLeft}s</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="max-w-md mx-auto border-(--color-border)">
        <p className="text-xs font-semibold tracking-wide text-(--color-text-faint) uppercase mb-3">Attendance today</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl bg-(--color-surface-2) p-3">
            <p className="text-xs text-(--color-text-faint)">In</p>
            <p className="mt-1 font-display text-xl font-semibold text-(--color-text)">{attendanceToday.checkedIn}</p>
          </div>
          <div className="rounded-2xl bg-(--color-surface-2) p-3">
            <p className="text-xs text-(--color-text-faint)">Inside</p>
            <p className="mt-1 font-display text-xl font-semibold text-(--color-text)">{attendanceToday.currentlyIn}</p>
          </div>
          <div className="rounded-2xl bg-(--color-surface-2) p-3">
            <p className="text-xs text-(--color-text-faint)">Out</p>
            <p className="mt-1 font-display text-xl font-semibold text-(--color-text)">{attendanceToday.checkedOut}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}