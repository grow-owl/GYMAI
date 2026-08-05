import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Upload, Clock3, Plus } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import BarChart, { type BarDatum } from "@/components/ui/BarChart";
import { progressApi } from "@/lib/endpoints";
import { toast } from "sonner";

interface ProgressPhoto {
  id: string;
  capturedAt: string;
  src: string;
}

const PHOTO_STORAGE_KEY = "member-progress-photos-v1";
const UPLOAD_GAP_DAYS = 5;

const stats = [
  { label: "Weight", value: "74.2 kg", change: "-1.8 kg / 8 weeks" },
  { label: "Bench Press", value: "75 kg", change: "+8% / 4 weeks" },
  { label: "Body Fat", value: "16.4%", change: "-2.1% / 6 weeks" },
  { label: "Resting HR", value: "58 bpm", change: "-4 bpm / 8 weeks" },
];

const initialWeightTrend = [
  { label: "W1", value: 76.0 },
  { label: "W2", value: 75.7 },
  { label: "W3", value: 75.3 },
  { label: "W4", value: 75.0 },
  { label: "W5", value: 74.8 },
  { label: "W6", value: 74.6 },
  { label: "W7", value: 74.4 },
  { label: "W8", value: 74.2 },
];

const strengthTrend: BarDatum[] = [
  { label: "Squat", value: 95, color: "var(--tone-blue)" },
  { label: "Bench", value: 75, color: "var(--color-accent)" },
  { label: "Deadlift", value: 120, color: "var(--tone-green)" },
  { label: "Row", value: 62, color: "var(--tone-purple)" },
];

function daysBetween(a: Date, b: Date) {
  const ms = Math.abs(a.getTime() - b.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function WeightLineChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const width = 420;
  const height = 170;
  const padX = 16;
  const padY = 16;
  const min = Math.min(...data.map((d) => d.value));
  const max = Math.max(...data.map((d) => d.value));
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
        <polyline points={points} fill="none" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => {
          const x = padX + (i * (width - padX * 2)) / Math.max(1, data.length - 1);
          const y = padY + ((max - d.value) * (height - padY * 2)) / range;
          return <circle key={d.label} cx={x} cy={y} r="3.5" fill="var(--color-accent)" />;
        })}
      </svg>
      <div className="mt-2 flex items-center justify-between text-[11px] text-(--color-text-faint)">
        {data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

export default function Progress() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [weightData, setWeightData] = useState(initialWeightTrend);
  const [showLogModal, setShowLogModal] = useState(false);
  const [newWeight, setNewWeight] = useState("74.0");

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

  const latestPhoto = photos[0];
  const today = new Date();
  const daysSinceLatest = latestPhoto ? daysBetween(today, new Date(latestPhoto.capturedAt)) : UPLOAD_GAP_DAYS;
  const canUploadNow = daysSinceLatest >= UPLOAD_GAP_DAYS;
  const remainingDays = Math.max(0, UPLOAD_GAP_DAYS - daysSinceLatest);

  const avgWeight = useMemo(() => {
    const total = weightData.reduce((sum, point) => sum + point.value, 0);
    return (total / weightData.length).toFixed(1);
  }, [weightData]);

  const handleSaveWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(newWeight);
    if (isNaN(w) || w <= 0) return;
    try {
      await progressApi.logWeight(w, "Daily weigh-in");
      setWeightData((prev) => [...prev, { label: `W${prev.length + 1}`, value: w }]);
      toast.success(`Weight ${w} kg saved to backend!`);
      setShowLogModal(false);
    } catch {
      setWeightData((prev) => [...prev, { label: `W${prev.length + 1}`, value: w }]);
      toast.success(`Weight ${w} kg logged!`);
      setShowLogModal(false);
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
      toast.success("Progress photo saved!");
    };
    reader.readAsDataURL(file);

    e.target.value = "";
  }

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        title="Progress Report"
        subtitle="Graph + photo timeline"
        backTo="/member"
        action={
          <button
            onClick={() => setShowLogModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-(--color-accent) text-white text-xs font-medium px-4 py-2 hover:opacity-90"
          >
            <Plus size={14} /> Log Weight
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <p className="font-display text-xl font-semibold text-(--color-text)">
              {s.label === "Weight" ? `${weightData[weightData.length - 1].value} kg` : s.value}
            </p>
            <p className="text-xs text-(--color-text-faint) mt-1">{s.label}</p>
            <p className="text-[11px] text-(--color-good) mt-1">{s.change}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="text-xs font-semibold tracking-wide text-(--color-text-faint) uppercase mb-3">Weight trend (line)</p>
          <WeightLineChart data={weightData} />
          <p className="text-xs text-(--color-text-muted) mt-3">Average weight: <span className="font-semibold text-(--color-text)">{avgWeight} kg</span></p>
        </Card>

        <Card>
          <p className="text-xs font-semibold tracking-wide text-(--color-text-faint) uppercase mb-3">Strength progress (bar)</p>
          <BarChart data={strengthTrend} height={180} />
        </Card>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-(--color-text-faint) uppercase">Progress photos</p>
            <p className="text-xs text-(--color-text-muted) mt-1">Upload every {UPLOAD_GAP_DAYS} days to compare visual change.</p>
          </div>

          <button
            type="button"
            onClick={handlePickPhoto}
            disabled={!canUploadNow}
            className="rounded-full bg-(--color-accent) text-white text-xs sm:text-sm font-semibold px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Camera size={14} /> Upload photo
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
            <Clock3 size={13} /> Next photo upload in {remainingDays} day{remainingDays === 1 ? "" : "s"}.
          </div>
        )}

        {photos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-(--color-border) bg-(--color-surface-2) p-8 text-center">
            <Upload size={20} className="mx-auto text-(--color-text-faint)" />
            <p className="mt-2 text-sm text-(--color-text-muted)">No progress photos yet. Add your first photo today.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((photo, index) => (
              <div key={photo.id} className="relative overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface-2)">
                <img src={photo.src} alt={`Progress ${index + 1}`} className="h-44 w-full object-cover" />
                <div className="absolute left-2 bottom-2 rounded-full bg-black/55 px-2 py-1 text-[10px] text-white">
                  {formatShortDate(photo.capturedAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Log Weight Modal */}
      {showLogModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="bg-(--color-surface) border border-(--color-border) rounded-3xl p-6 sm:p-8 w-full max-w-md space-y-5 shadow-2xl relative overflow-hidden">
              <h3 className="font-display text-lg font-bold text-(--color-text)">Log Weight Entry</h3>
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
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
