import { useMemo, useRef, useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { Camera, Upload, Clock3, Plus, Scale, Target, Activity, TrendingDown, Trash2, Sparkles, Loader2 } from "lucide-react";
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
  angle?: string;
  notes?: string;
}

const UPLOAD_GAP_DAYS = 5;

function daysBetween(a: Date, b: Date) {
  const ms = Math.abs(a.getTime() - b.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Client-side Canvas Image Compression
 * Shrinks 8-15MB camera images to ~150-250KB JPEG (1200px max dimension, 0.8 quality)
 */
function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
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
      const x = data.length === 1 ? width / 2 : padX + (i * (width - padX * 2)) / (data.length - 1);
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
          const x = data.length === 1 ? width / 2 : padX + (i * (width - padX * 2)) / (data.length - 1);
          const y = padY + ((max - d.value) * (height - padY * 2)) / range;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="5" fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth="2" />
              <text x={x} y={y - 9} fontSize="10" textAnchor="middle" fill="var(--color-text)" fontWeight="bold">
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

  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadProgressData = async () => {
    setLoading(true);
    try {
      const profRes = await memberApi.getSelfProfile().catch(() => null);
      const m = profRes?.member;
      if (m) setMemberProfile(m);

      const memberId = m?._id || user?._id;
      if (memberId) {
        const [wRes, compRes, photoRes, _summaryRes] = await Promise.all([
          progressApi.getHistory(memberId).catch(() => null),
          workoutApi.getCompletionStats(memberId).catch(() => null),
          progressApi.getPhotos(memberId).catch(() => null),
          progressApi.getSummary().catch(() => null),
        ]);

        const rawPhotos = Array.isArray(photoRes)
          ? photoRes
          : Array.isArray(photoRes?.photos)
          ? photoRes.photos
          : [];

        if (rawPhotos.length > 0) {
          const remotePhotos: ProgressPhoto[] = rawPhotos.map((p: any) => ({
            id: p._id || p.id,
            capturedAt: p.recordedAt || p.createdAt || p.capturedAt || new Date().toISOString(),
            src: p.imageUrl || p.photoUrl || p.src,
            angle: p.angle || "front",
            notes: p.notes,
          }));
          remotePhotos.sort(
            (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
          );
          setPhotos(remotePhotos);
        } else {
          setPhotos([]);
        }

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

        const statsData = compRes?.stats || compRes;
        if (statsData?.weeklyVolumeLogs && Array.isArray(statsData.weeklyVolumeLogs)) {
          const bars: BarDatum[] = statsData.weeklyVolumeLogs.map((log: any) => ({
            label: log.day || "Day",
            value: log.volume || 0,
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

  // Before & After visual comparison calculation
  const sortedAscending = useMemo(() => {
    return [...photos].sort(
      (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
    );
  }, [photos]);

  const baselinePhoto = sortedAscending.length >= 2 ? sortedAscending[0] : null;
  const currentPhoto = sortedAscending.length >= 2 ? sortedAscending[sortedAscending.length - 1] : null;
  const daysTransformed =
    baselinePhoto && currentPhoto
      ? daysBetween(new Date(currentPhoto.capturedAt), new Date(baselinePhoto.capturedAt))
      : 0;

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

  function handlePickPhoto() {
    if (!canUploadNow || uploading) return;
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a valid image file");
      e.target.value = "";
      return;
    }

    setUploading(true);
    const toastId = toast.loading("Compressing & uploading photo to Cloudinary...");
    try {
      const compressedBase64 = await compressImage(file, 1200, 0.8);
      await progressApi.uploadPhoto({
        image: compressedBase64,
        angle: "front",
        notes: "Member Progress Check-in",
      });
      toast.success("Progress photo uploaded & synced!", { id: toastId });
      await loadProgressData();
    } catch (err: any) {
      console.error("Progress photo upload error:", err);
      toast.error(
        err.response?.data?.message || err.message || "Failed to upload photo. Please try again.",
        { id: toastId }
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDeletePhoto(photoId: string) {
    if (
      !window.confirm(
        "Are you sure you want to delete this progress photo? It will be permanently removed from Cloudinary and your timeline."
      )
    ) {
      return;
    }

    setDeletingId(photoId);
    try {
      await progressApi.deletePhoto(photoId);
      toast.success("Progress photo deleted successfully!");
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err: any) {
      console.error("Photo delete error:", err);
      toast.error(
        err.response?.data?.message || err.message || "Failed to delete progress photo."
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500" />
      </div>
    );
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
          <p className="text-xs font-semibold tracking-wide text-(--color-text-faint) uppercase mb-3">Weekly Volume Progression</p>
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

      {/* Transformation Highlight: Before vs After */}
      {baselinePhoto && currentPhoto && (
        <Card className="p-5 border border-amber-500/30 bg-linear-to-r from-amber-500/5 via-transparent to-orange-500/5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-500">
                <Sparkles size={16} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-(--color-text)">Transformation Highlight</h3>
                <p className="text-xs text-(--color-text-muted)">
                  Visual comparison from your initial Day 1 baseline to your latest check-in
                </p>
              </div>
            </div>
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-500 border border-amber-500/30">
              🔥 {daysTransformed} Days of Progress
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Baseline / Day 1 */}
            <div className="relative overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface-2)">
              <div className="absolute top-3 left-3 z-10 rounded-full bg-black/75 px-3 py-1 text-[11px] font-bold text-white shadow backdrop-blur-xs">
                BEFORE (Baseline)
              </div>
              <div className="absolute bottom-3 left-3 z-10 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] text-zinc-300 backdrop-blur-xs">
                {formatShortDate(baselinePhoto.capturedAt)}
              </div>
              <img
                src={baselinePhoto.src}
                alt="Baseline Transformation"
                className="h-64 sm:h-72 w-full object-cover"
              />
            </div>

            {/* Current / Latest */}
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-(--color-surface-2) ring-1 ring-amber-500/20">
              <div className="absolute top-3 left-3 z-10 rounded-full bg-amber-500 px-3 py-1 text-[11px] font-bold text-zinc-950 shadow">
                AFTER (Latest)
              </div>
              <div className="absolute bottom-3 left-3 z-10 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] text-zinc-300 backdrop-blur-xs">
                {formatShortDate(currentPhoto.capturedAt)}
              </div>
              <img
                src={currentPhoto.src}
                alt="Latest Transformation"
                className="h-64 sm:h-72 w-full object-cover"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Progress Photos Section */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-(--color-text-faint) uppercase">
              Progress Photo Timeline {photos.length > 0 && `(${photos.length} Total)`}
            </p>
            <p className="text-xs text-(--color-text-muted) mt-1">
              Upload body transformation photos every {UPLOAD_GAP_DAYS} days to visually compare muscle gains and physical changes.
            </p>
          </div>

          <button
            type="button"
            onClick={handlePickPhoto}
            disabled={!canUploadNow || uploading}
            className="rounded-full bg-(--color-accent) text-white text-xs sm:text-sm font-semibold px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md hover:opacity-90 transition-all"
          >
            {uploading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <Camera size={14} /> Upload Photo
              </>
            )}
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
            <Clock3 size={13} className="text-amber-400" /> Next photo upload available in {remainingDays} day{remainingDays === 1 ? "" : "s"}.
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
              <div
                key={photo.id}
                className="group relative overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface-2)"
              >
                <img
                  src={photo.src}
                  alt={`Progress ${index + 1}`}
                  className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute left-2 bottom-2 rounded-full bg-black/70 px-2.5 py-1 text-[10px] text-white font-semibold backdrop-blur-xs">
                  {formatShortDate(photo.capturedAt)}
                </div>
                {photo.angle && (
                  <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-medium text-amber-300 uppercase tracking-wider backdrop-blur-xs">
                    {photo.angle}
                  </div>
                )}
                <button
                  type="button"
                  title="Delete progress photo"
                  disabled={deletingId === photo.id}
                  onClick={() => handleDeletePhoto(photo.id)}
                  className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-red-400 opacity-90 sm:opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                >
                  {deletingId === photo.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Trash2 size={12} />
                  )}
                </button>
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

