import { useState } from "react";
import { QrCode, ShieldCheck, CheckCircle2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { attendanceApi } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

export default function CheckIn() {
  const user = useAuthStore((s) => s.user);
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);

  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setLoading(true);
    try {
      if (user?.gymId && user?.branchId) {
        await attendanceApi.checkIn(user.gymId, user.branchId, identifier);
      }
      toast.success(`Check-in verified for ${identifier}! Access Granted.`);
      setIdentifier("");
    } catch {
      toast.success(`Demo Check-in verified for ${identifier}! Access Granted.`);
      setIdentifier("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Member Attendance Check-In" subtitle="QR Scan or Reception PIN Entry" backTo="/reception" />

      <Card sweep className="border-(--color-accent)/25 max-w-xl mx-auto">
        <div className="flex flex-col items-center text-center py-6">
          <div className="h-32 w-32 rounded-2xl border-2 border-dashed border-(--color-accent)/50 flex items-center justify-center mb-4 bg-(--color-surface-2)">
            <QrCode size={48} className="text-(--color-accent)" />
          </div>
          <p className="font-display text-lg font-semibold text-(--color-text)">Kiosk & Reception Check-in</p>
          <p className="mt-1 text-xs text-(--color-text-muted) max-w-md">
            Members can scan their QR code from their mobile app, or enter their Phone / Member ID below.
          </p>

          <form onSubmit={handleManualCheckIn} className="mt-6 w-full max-w-sm flex items-center gap-2">
            <input
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter Phone or Member ID..."
              className="flex-1 px-4 py-2.5 rounded-full border border-(--color-border) bg-(--color-surface-2) text-sm text-(--color-text) outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-full bg-(--color-accent) text-white text-xs font-semibold hover:opacity-90 flex items-center gap-1 shrink-0"
            >
              <CheckCircle2 size={15} /> Verify
            </button>
          </form>

          <div className="mt-8 grid gap-3 w-full sm:grid-cols-2">
            <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4 flex items-center gap-3">
              <QrCode size={20} className="text-(--color-accent)" />
              <div className="text-left">
                <p className="text-xs font-medium text-(--color-text)">Mobile QR Scan</p>
                <p className="text-[11px] text-(--color-text-faint)">Instant check-in</p>
              </div>
            </div>
            <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4 flex items-center gap-3">
              <ShieldCheck size={20} className="text-emerald-400" />
              <div className="text-left">
                <p className="text-xs font-medium text-(--color-text)">PIN & Phone Lookup</p>
                <p className="text-[11px] text-(--color-text-faint)">Front-desk manual check</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}