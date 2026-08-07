import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { attendanceApi } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import QRCode from "qrcode";

export default function Attendance() {
  const user = useAuthStore((s) => s.user);
  const [secondsLeft, setSecondsLeft] = useState(21);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(true);

  const fetchKioskQr = useCallback(async () => {
    if (!user?.gymId || !user?.branchId) {
      setQrLoading(false);
      return;
    }
    setQrLoading(true);
    try {
      const res = await attendanceApi.generateQR(user.gymId, user.branchId, 21);
      if (res?.qrCodeDataUrl) {
        setQrCodeUrl(res.qrCodeDataUrl);
      } else if (res?.qrToken) {
        const url = await QRCode.toDataURL(res.qrToken);
        setQrCodeUrl(url);
      }
      setSecondsLeft(res?.ttlSeconds || 21);
    } catch (err) {
      console.error("Failed to generate dynamic branch QR code:", err);
    } finally {
      setQrLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchKioskQr();
  }, [user, fetchKioskQr]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          fetchKioskQr();
          return 21;
        }
        return value - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fetchKioskQr]);

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

          <div className="mx-auto mt-8 w-full max-w-[18rem] rounded-2xl border border-(--color-border) bg-(--color-surface) p-5 shadow-sm flex flex-col items-center">
            <div className="h-44 w-44 rounded-xl border border-(--color-border) flex items-center justify-center bg-white p-2.5 shadow-xs relative overflow-hidden">
              {qrLoading && !qrCodeUrl ? (
                <div className="flex flex-col items-center gap-2 text-xs text-(--color-text-muted)">
                  <Loader2 className="animate-spin text-(--color-accent)" size={20} />
                  <span>Generating QR...</span>
                </div>
              ) : qrCodeUrl ? (
                <img src={qrCodeUrl} alt="Scan to check in/out" className="w-full h-full object-contain" />
              ) : (
                <div className="text-xs text-(--color-text-muted)">No QR Available</div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 text-sm text-(--color-text-muted)">
              <button
                onClick={fetchKioskQr}
                disabled={qrLoading}
                title="Refresh QR Code"
                className="p-1 rounded-lg hover:bg-white/10 text-(--color-accent) transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={14} className={qrLoading ? "animate-spin" : ""} />
              </button>
              <span className="font-mono">Refreshes in</span>
              <span className="font-semibold text-(--color-accent-text)">{secondsLeft}s</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}