import { useState } from "react";
import { CheckCircle2, Keyboard, QrCode } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import QRScanner from "@/components/member/QRScanner";
import { gym } from "@/data/mock";

type ScanView = "idle" | "scanning" | "invalid" | "success";

const CHECKIN_PREFIX = "GYMAI-CHECKIN";

export default function Attendance() {
  const [view, setView] = useState<ScanView>("idle");
  const [checkedInAt, setCheckedInAt] = useState<string | null>(null);

  function handleScan(data: string) {
    if (data.startsWith(CHECKIN_PREFIX)) {
      setCheckedInAt(new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }));
      setView("success");
      return;
    }

    setView("invalid");
  }

  return (
    <div className="space-y-5 pb-4 md:pb-0 max-w-2xl mx-auto w-full">
      <PageHeader title="GYM ACCESS" subtitle="CHECK IN / OUT" backTo="/member" />

      <Card sweep className="border-(--color-border) px-4 sm:px-5 py-5 sm:py-6">
        {view === "idle" && (
          <div className="space-y-5 text-center">
            <p className="text-sm sm:text-base text-(--color-text-muted)">Scan the live QR code at reception to check in.</p>

            <button
              onClick={() => setView("scanning")}
              className="w-full rounded-xl bg-(--color-accent) hover:bg-(--color-accent-strong) text-(--color-navbar) text-base sm:text-lg font-semibold py-3.5 flex items-center justify-center gap-2 transition-colors"
            >
              <QrCode size={18} /> Open Camera to Scan
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-2 text-sm sm:text-base text-(--color-text-muted) hover:text-(--color-text)"
            >
              <Keyboard size={15} /> Enter code manually instead
            </button>
          </div>
        )}

        {view === "scanning" && (
          <QRScanner onScan={handleScan} onClose={() => setView("idle")} />
        )}

        {view === "invalid" && (
          <div className="flex flex-col items-center text-center py-8">
            <p className="text-sm text-(--color-text)">That doesn't look like a valid check-in code.</p>
            <p className="text-xs text-(--color-text-faint) mt-1">Please try the live gym QR again.</p>
            <button
              onClick={() => setView("scanning")}
              className="mt-5 rounded-full bg-(--color-accent) hover:bg-(--color-accent-strong) text-(--color-navbar) text-sm font-semibold px-5 py-2.5 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {view === "success" && (
          <div className="flex flex-col items-center text-center py-8">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-(--color-good-soft) text-(--color-good)">
              <CheckCircle2 size={28} />
            </span>
            <p className="font-display text-lg font-semibold text-(--color-text) mt-4">Checked in!</p>
            <p className="text-xs text-(--color-text-faint) mt-1">
              {checkedInAt} · {gym.name} {gym.branch}
            </p>
            <button
              onClick={() => setView("idle")}
              className="mt-6 rounded-full border border-(--color-border) text-(--color-text-muted) text-sm font-medium px-5 py-2.5"
            >
              Back
            </button>
          </div>
        )}
      </Card>

      <button
        type="button"
        className="w-full rounded-xl border border-(--color-border) bg-(--color-surface-2) text-(--color-text) text-base font-semibold py-3.5"
      >
        Check Out (End Workout)
      </button>
    </div>
  );
}
