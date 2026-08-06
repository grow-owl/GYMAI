import { useState, useEffect } from "react";
import { QrCode, CheckCircle, LogOut, Clock, ShieldCheck, Loader2 } from "lucide-react";
import Card from "@/components/ui/Card";
import { attendanceApi } from "@/lib/endpoints";
import { toast } from "sonner";
import QRCode from "qrcode";

interface AttendanceCardProps {
  gymId?: string;
  branchId?: string;
  memberId?: string;
}

export default function AttendanceCheckInCard({ gymId, branchId, memberId }: AttendanceCardProps) {
  const [currentSession, setCurrentSession] = useState<any | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [memberQrDataUrl, setMemberQrDataUrl] = useState<string | null>(null);

  const fetchAttendance = async () => {
    try {
      const [currRes, statsRes] = await Promise.all([
        attendanceApi.getCurrentSession().catch(() => null),
        attendanceApi.getMyStats().catch(() => null),
      ]);

      if (currRes && (currRes.session || currRes._id)) {
        setCurrentSession(currRes.session || currRes);
      }
      if (statsRes) {
        setStats(statsRes.stats || statsRes);
      }
    } catch {}
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  useEffect(() => {
    if (memberId) {
      QRCode.toDataURL(`MEMBER:${memberId}`)
        .then((url) => setMemberQrDataUrl(url))
        .catch(() => setMemberQrDataUrl(null));
    }
  }, [memberId]);

  const handleInstantCheckIn = async () => {
    setCheckingIn(true);
    try {
      const res = await attendanceApi.checkIn({ gymId, branchId, memberId });
      toast.success("Checked in successfully! Have a great workout 💪");
      setCurrentSession(res?.checkIn || (res as any)?.attendance || { _id: "att-now", checkInTime: new Date().toISOString() });
      fetchAttendance();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Check-in failed. Please try again.");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!currentSession?._id) return;
    setCheckingIn(true);
    try {
      await attendanceApi.checkOut(currentSession._id);
      toast.success("Checked out! Workout duration logged.");
      setCurrentSession(null);
      fetchAttendance();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to check out. Please try again.");
    } finally {
      setCheckingIn(false);
    }
  };

  const totalDaysDisplay = stats?.totalDays ?? stats?.totalVisits ?? "--";
  const streakDisplay = stats?.currentStreak ?? stats?.streak ?? "--";
  const rateDisplay = stats?.attendanceRate != null ? `${stats.attendanceRate}%` : "--";

  return (
    <Card className="relative overflow-hidden border border-(--color-border) bg-(--color-surface) p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-(--color-text)">
              Gym Access & Attendance
            </h3>
            <p className="text-xs text-(--color-text-muted)">
              Instant check-in, live session status & QR scanner
            </p>
          </div>
        </div>

        {memberId && (
          <button
            onClick={() => setShowQRModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-xs font-semibold text-white hover:bg-white/15 transition-all border border-white/10"
          >
            <QrCode className="h-4 w-4 text-emerald-400" /> Member QR
          </button>
        )}
      </div>

      {/* Main Status Banner */}
      <div className="p-4 rounded-2xl bg-(--color-surface-2)/60 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        {currentSession ? (
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <CheckCircle className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-white flex items-center gap-2">
                Active Gym Session
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  IN GYM NOW
                </span>
              </p>
              <p className="text-xs text-(--color-text-muted) flex items-center gap-1 mt-0.5">
                <Clock className="h-3.5 w-3.5 text-emerald-400" />
                Checked in at {new Date(currentSession.checkInTime || currentSession.checkInAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/60">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-white">Not Checked In</p>
              <p className="text-xs text-(--color-text-muted)">Ready for today's training session?</p>
            </div>
          </div>
        )}

        {/* Action Button */}
        {currentSession ? (
          <button
            onClick={handleCheckOut}
            disabled={checkingIn}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-600/90 text-white text-xs font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
          >
            {checkingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Check Out Now
          </button>
        ) : (
          <button
            onClick={handleInstantCheckIn}
            disabled={checkingIn}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
          >
            {checkingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            1-Tap Check-In
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-3 rounded-xl bg-(--color-surface-2)/40 border border-white/5">
          <span className="text-[11px] text-(--color-text-muted)">Total Visits</span>
          <p className="text-lg font-extrabold text-white mt-0.5">{totalDaysDisplay !== "--" ? `${totalDaysDisplay} Days` : "--"}</p>
        </div>
        <div className="p-3 rounded-xl bg-(--color-surface-2)/40 border border-white/5">
          <span className="text-[11px] text-(--color-text-muted)">Current Streak</span>
          <p className="text-lg font-extrabold text-amber-400 mt-0.5">{streakDisplay !== "--" ? `${streakDisplay} Days` : "--"}</p>
        </div>
        <div className="p-3 rounded-xl bg-(--color-surface-2)/40 border border-white/5">
          <span className="text-[11px] text-(--color-text-muted)">Check-in Rate</span>
          <p className="text-lg font-extrabold text-emerald-400 mt-0.5">{rateDisplay}</p>
        </div>
      </div>

      {/* Member QR Code Modal */}
      {showQRModal && memberId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-(--color-surface) p-6 border border-(--color-border) text-center space-y-4 shadow-2xl">
            <h4 className="font-display text-lg font-bold text-white">Your Gym Pass QR Code</h4>
            <p className="text-xs text-(--color-text-muted)">Scan this pass code at reception</p>

            <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-2xl bg-white p-4">
              {memberQrDataUrl ? (
                <img src={memberQrDataUrl} alt="Member QR Pass" className="w-full h-full object-contain" />
              ) : (
                <QrCode className="h-40 w-40 text-black animate-pulse" />
              )}
            </div>

            <p className="text-xs font-mono text-(--color-text-muted)">Member ID: {memberId}</p>

            <button
              onClick={() => setShowQRModal(false)}
              className="w-full py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all"
            >
              Close QR Code
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
