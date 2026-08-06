import { useMemo, useRef, useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { Camera, Upload, Clock3, Plus, Scale, Target, Activity, TrendingDown } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import BarChart, { type BarDatum } from "@/components/ui/BarChart";
import { progressApi, memberApi, workoutApi } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

interface ProgressPhoto {
  id: string;
  capturedAt: string;
  src: string;
}

const PHOTO_STORAGE_KEY = "member-progress-photos-v1";
const UPLOAD_GAP_DAYS = 5;

function daysBetween(a: Date, b: Date) {
  const ms = Math.abs(a.getTime() - b.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function WeightLineChart({ data }: { data: Array<{ label: string; value: number }> }) {
  if (data.length === 0) {
    return (
      <div className="w-full h-44 flex flex-col items-center justify-center text-center p-4 bg-(--color-surface-2)/30 rounded-xl border border-dashed border-(--color-border)">
        <Scale className="w-8 h-8 text-(--color-text-faint) mb-2" />
        <p className="text-xs font-semibold text-(--color-text-muted)">No weight entries recorded yet</p>
        <p className="text-[11px] text-(--color-text-faint) mt-0.5">Click "+ Log Weight" to start tracking your weight journey.</p>
      </div>
    );
  }

  const width = 420;
  const height = 170;
  const padX = 24;
  const padY = 20;
  const weights = data.map((d) => d.value);
  const min = Math.min(...weights) - 0.5;
  const max = Math.max(...weights) + 0.5;
  const range = Math.max(0.1, max - min);

  const points = data
    .map((d, i) => {
      const x = padX + (i * (width - padX * 2)) / Math.max(1, data.length - 1);
      const y = padY + ((max - d.value) * (height - padY * 2)) / range;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44">
        <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="var(--color-border)" strokeWidth="1" />
        {data.length > 1 && (
          <polyline points={points} fill="none" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {data.map((d, i) => {
          const x = padX + (i * (width - padX * 2)) / Math.max(1, data.length - 1);
          const y = padY + ((max - d.value) * (height - padY * 2)) / range;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="4" fill="var(--color-accent)" />
              <text x={x} y={y - 8} fontSize="9" textAnchor="middle" fill="var(--color-text)" fontWeight="bold">
                {d.value} kg
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex items-center justify-between text-[11px] text-(--color-text-faint) overflow-x-auto">
        {data.map((d, idx) => (
          <span key={idx} className="truncate px-1">{d.label}</span>
        ))}
      </div>
    </div>
  );
}

export default function Progress() {
  const user = useAuthStore((s) => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [weightLogs, setWeightLogs] = useState<Array<{ label: string; value: number; createdAt: string }>>([]);
  const [memberProfile, setMemberProfile] = useState<any | null>(null);
  const [strengthTrend, setStrengthTrend] = useState<BarDatum[]>([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [newWeight, setNewWeight] = useState("70.0");

  const [photos, setPhotos] = useState<ProgressPhoto[]>(() => {
    try {
      const raw = localStorage.getItem(PHOTO_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as ProgressPhoto[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const loadProgressData = async () => {
    setLoading(true);
    try {
      const profRes = await memberApi.getSelfProfile().catch(() => null);
      const m = profRes?.member;
      if (m) setMemberProfile(m);

      const memberId = m?._id || user?._id;
      if (memberId) {
        const [wRes, compRes] = await Promise.all([
          progressApi.getHistory(memberId).catch(() => null),
          workoutApi.getCompletionStats(memberId).catch(() => null),
        ]);

        if (wRes) {
          const rawList = Array.isArray(wRes) ? wRes : wRes?.history || wRes?.logs || [];
          const sorted = [...rawList].sort(
            (a, b) => new Date(a.createdAt || a.recordedAt).getTime() - new Date(b.createdAt || b.recordedAt).getTime()
          );
          const mapped = sorted.map((item, idx) => ({
            label: new Date(item.createdAt || item.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) || `Log ${idx + 1}`,
            value: Number(item.weightKg),
            createdAt: item.createdAt || item.recordedAt,
          }));
          setWeightLogs(mapped);
          if (mapped.length > 0) {
            setNewWeight(String(mapped[mapped.length - 1].value));
          }
        }

        if (compRes?.exerciseStats && Array.isArray(compRes.exerciseStats)) {
          const bars: BarDatum[] = compRes.exerciseStats.slice(0, 4).map((ex: any) => ({
            label: ex.name || "Exercise",
            value: ex.maxWeightKg || ex.volume || 0,
            color: "var(--color-accent)",
          }));
          setStrengthTrend(bars);
        }
      }
    } catch (err) {
      console.error("Error loading progress data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProgressData();
  }, []);

  const latestPhoto = photos[0];
  const today = new Date();
  const daysSinceLatest = latestPhoto ? daysBetween(today, new Date(latestPhoto.capturedAt)) : UPLOAD_GAP_DAYS;
  const canUploadNow = daysSinceLatest >= UPLOAD_GAP_DAYS;
  const remainingDays = Math.max(0, UPLOAD_GAP_DAYS - daysSinceLatest);

  const latestWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].value : null;
  const initialWeight = weightLogs.length > 0 ? weightLogs[0].value : null;
  const totalChange = latestWeight !== null && initialWeight !== null ? (latestWeight - initialWeight).toFixed(1) : null;
  const targetWeight = memberProfile?.healthInfo?.targetWeight_kg || memberProfile?.targetWeightKg || null;

  const avgWeight = useMemo(() => {
    if (weightLogs.length === 0) return "--";
    const total = weightLogs.reduce((sum, point) => sum + point.value, 0);
    return (total / weightLogs.length).toFixed(1);
  }, [weightLogs]);

  const handleSaveWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(newWeight);
    if (isNaN(w) || w <= 0) return;
    try {
      await progressApi.logWeight(w, "Daily weigh-in");
      toast.success(`Weight ${w} kg saved successfully!`);
      setShowLogModal(false);
      loadProgressData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to log weight. Please try again.");
    }
  };

  function persist(next: ProgressPhoto[]) {
    setPhotos(next);
    localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(next));
  }

  function handlePickPhoto() {
    if (!canUploadNow) return;
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result ?? "");
      if (!src) return;

      const next: ProgressPhoto[] = [
        { id: crypto.randomUUID(), capturedAt: new Date().toISOString(), src },
        ...photos,
      ].slice(0, 18);
      persist(next);
      toast.success("Progress photo saved successfully!");
    };
    reader.readAsDataURL(file);

    e.target.value = "";
  }

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        title="Progress Report"
        subtitle="Track weight changes, strength progression & body transformation timeline"
        backTo="/member"
        action={
          <button
            onClick={() => setShowLogModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-(--color-accent) text-white text-xs font-semibold px-4 py-2 hover:opacity-90 transition-all shadow-md"
          >
            <Plus size={14} /> Log Weight
          </button>
        }
      />

      {/* Dynamic Key Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 bg-(--color-surface) border border-(--color-border)">
          <div className="flex items-center gap-2 mb-1 text-(--color-accent)">
            <Scale size={16} />
            <p className="text-xs font-semibold text-(--color-text-muted)">Current Weight</p>
          </div>
          <p className="font-display text-xl font-bold text-(--color-text)">
            {latestWeight !== null ? `${latestWeight} kg` : "--"}
          </p>
          <p className="text-[11px] text-(--color-text-faint) mt-1">
            {weightLogs.length > 0 ? `${weightLogs.length} logs recorded` : "No weigh-ins yet"}
          </p>
        </Card>

        <Card className="p-4 bg-(--color-surface) border border-(--color-border)">
          <div className="flex items-center gap-2 mb-1 text-emerald-400">
            <TrendingDown size={16} />
            <p className="text-xs font-semibold text-(--color-text-muted)">Total Weight Change</p>
          </div>
          <p className="font-display text-xl font-bold text-(--color-text)">
            {totalChange !== null ? `${Number(totalChange) > 0 ? `+${totalChange}` : totalChange} kg` : "--"}
          </p>
          <p className="text-[11px] text-emerald-400 mt-1">
            {totalChange !== null ? "Since first logged weigh-in" : "Log weight to calculate"}
          </p>
        </Card>

        <Card className="p-4 bg-(--color-surface) border border-(--color-border)">
          <div className="flex items-center gap-2 mb-1 text-indigo-400">
            <Target size={16} />
            <p className="text-xs font-semibold text-(--color-text-muted)">Target Weight</p>
          </div>
          <p className="font-display text-xl font-bold text-(--color-text)">
            {targetWeight ? `${targetWeight} kg` : "--"}
          </p>
          <p className="text-[11px] text-(--color-text-faint) mt-1">
            {targetWeight && latestWeight ? `${(latestWeight - targetWeight).toFixed(1)} kg remaining` : "Set target in profile"}
          </p>
        </Card>

        <Card className="p-4 bg-(--color-surface) border border-(--color-border)">
          <div className="flex items-center gap-2 mb-1 text-amber-400">
            <Activity size={16} />
            <p className="text-xs font-semibold text-(--color-text-muted)">Average Weight</p>
          </div>
          <p className="font-display text-xl font-bold text-(--color-text)">
            {avgWeight !== "--" ? `${avgWeight} kg` : "--"}
          </p>
          <p className="text-[11px] text-(--color-text-faint) mt-1">Overall average weight</p>
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="text-xs font-semibold tracking-wide text-(--color-text-faint) uppercase mb-3">Weight Trend History</p>
          <WeightLineChart data={weightLogs} />
          {weightLogs.length > 0 && (
            <p className="text-xs text-(--color-text-muted) mt-3">
              Average weight: <span className="font-semibold text-(--color-text)">{avgWeight} kg</span>
            </p>
          )}
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold tracking-wide text-(--color-text-faint) uppercase mb-3">Strength & Exercise Progression</p>
          {strengthTrend.length > 0 ? (
            <BarChart data={strengthTrend} height={180} />
          ) : (
            <div className="w-full h-44 flex flex-col items-center justify-center text-center p-4 bg-(--color-surface-2)/30 rounded-xl border border-dashed border-(--color-border)">
              <Activity className="w-8 h-8 text-(--color-text-faint) mb-2" />
              <p className="text-xs font-semibold text-(--color-text-muted)">No Strength Logs Yet</p>
              <p className="text-[11px] text-(--color-text-faint) mt-0.5">Complete and log workout sessions to see your strength gains.</p>
            </div>
          )}
        </Card>
      </div>

      {/* Progress Photos Section */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-(--color-text-faint) uppercase">Progress Photo Timeline</p>
            <p className="text-xs text-(--color-text-muted) mt-1">
              Upload body transformation photos every {UPLOAD_GAP_DAYS} days to visually compare muscle gains and physical changes.
            </p>
          </div>

          <button
            type="button"
            onClick={handlePickPhoto}
            disabled={!canUploadNow}
            className="rounded-full bg-(--color-accent) text-white text-xs sm:text-sm font-semibold px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md"
          >
            <Camera size={14} /> Upload Photo
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        {!canUploadNow && (
          <div className="mb-4 rounded-xl border border-(--color-border) bg-(--color-surface-2) px-3 py-2 text-xs text-(--color-text-muted) flex items-center gap-1.5">
            <Clock3 size={13} /> Next photo upload available in {remainingDays} day{remainingDays === 1 ? "" : "s"}.
          </div>
        )}

        {photos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-(--color-border) bg-(--color-surface-2)/50 p-8 text-center">
            <Upload size={24} className="mx-auto text-(--color-text-faint)" />
            <p className="mt-2 text-sm font-semibold text-(--color-text)">No Progress Photos Uploaded Yet</p>
            <p className="text-xs text-(--color-text-muted) mt-0.5">Tap "Upload Photo" to capture your initial physique picture.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((photo, index) => (
              <div key={photo.id} className="relative overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface-2)">
                <img src={photo.src} alt={`Progress ${index + 1}`} className="h-44 w-full object-cover" />
                <div className="absolute left-2 bottom-2 rounded-full bg-black/70 px-2.5 py-1 text-[10px] text-white font-semibold">
                  {formatShortDate(photo.capturedAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Log Weight Modal */}
      {showLogModal && (
        <Modal onClose={() => setShowLogModal(false)} maxWidth="md" title="Log Weight Entry">
          <form onSubmit={handleSaveWeight} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-(--color-text-muted) block mb-1">Body Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                required
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                className="w-full p-3 rounded-2xl bg-(--color-surface-2) border border-(--color-border) text-base font-bold text-(--color-text) outline-none focus:border-(--color-accent) font-mono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="px-5 py-2.5 rounded-full text-xs font-semibold text-(--color-text-muted) hover:bg-(--color-surface-2)"
              >
                Cancel
              </button>
              <button type="submit" className="px-6 py-2.5 rounded-full text-xs font-bold bg-(--color-accent) text-white shadow-md">
                Save Weight
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

