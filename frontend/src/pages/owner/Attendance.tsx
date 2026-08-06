import { useEffect, useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { attendanceApi } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";

export default function Attendance() {
  const user = useAuthStore((s) => s.user);
  const [secondsLeft, setSecondsLeft] = useState(21);
  const [tokenCounter, setTokenCounter] = useState(1);
  const [loading, setLoading] = useState(true);
  const [todayLog, setTodayLog] = useState<any[]>([]);

  const fetchAttendance = async () => {
    const activeGymId = user?.gymId || "";
    const activeBranchId = user?.branchId || "";
    setLoading(true);
    try {
      const res = await attendanceApi.getToday(activeGymId, activeBranchId);
      const list = Array.isArray(res) ? res : res?.attendance || [];
      setTodayLog(list);
    } catch {
      setTodayLog([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          setTokenCounter((tc) => tc + 1);
          return 21;
        }
        return value - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const qrValue = JSON.stringify({
    type: "GYMAI_CHECKIN",
    gymId: user?.gymId || "65a000000000000000000001",
    branchId: user?.branchId || "65a000000000000000000002",
    t: tokenCounter,
  });

  const checkedInCount = todayLog.length;
  const currentlyInCount = todayLog.filter((a) => !a.checkOutTime).length;
  const checkedOutCount = todayLog.filter((a) => Boolean(a.checkOutTime)).length;

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
            <div className="mx-auto flex items-center justify-center p-3.5 rounded-xl bg-white shadow-xs border border-gray-100">
              <QRCodeSVG
                value={qrValue}
                size={180}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="M"
                marginSize={1}
              />
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 text-sm text-(--color-text-muted)">
              <RefreshCw size={15} className="text-(--color-accent) animate-spin-slow" />
              <span className="font-mono">Refreshes in</span>
              <span className="font-semibold text-(--color-accent-text)">{secondsLeft}s</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="max-w-md mx-auto border-(--color-border)">
        <p className="text-xs font-semibold tracking-wide text-(--color-text-faint) uppercase mb-3">Attendance today</p>
        {loading ? (
          <div className="flex items-center justify-center py-6 text-sm text-(--color-text-muted) gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-(--color-accent)" /> Loading today's attendance...
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-(--color-surface-2) p-3">
              <p className="text-xs text-(--color-text-faint)">In</p>
              <p className="mt-1 font-display text-xl font-semibold text-(--color-text)">{checkedInCount}</p>
            </div>
            <div className="rounded-2xl bg-(--color-surface-2) p-3">
              <p className="text-xs text-(--color-text-faint)">Inside</p>
              <p className="mt-1 font-display text-xl font-semibold text-(--color-text)">{currentlyInCount}</p>
            </div>
            <div className="rounded-2xl bg-(--color-surface-2) p-3">
              <p className="text-xs text-(--color-text-faint)">Out</p>
              <p className="mt-1 font-display text-xl font-semibold text-(--color-text)">{checkedOutCount}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}