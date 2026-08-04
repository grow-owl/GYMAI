import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell, Flame, ChevronRight, Loader2 } from "lucide-react";
import QuickAccessCard from "@/components/ui/QuickAccessCard";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import { memberQuickAccess } from "@/data/mock";
import { memberApi, workoutApi, gamificationApi } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

export default function MemberHome() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [memberProfile, setMemberProfile] = useState<any | null>(null);
  const [activePlan, setActivePlan] = useState<any | null>(null);
  const [gameProfile, setGameProfile] = useState<any | null>(null);

  useEffect(() => {
    setLoading(true);
    memberApi
      .getSelfProfile()
      .then((profRes) => {
        const m = profRes?.member;
        if (m) setMemberProfile(m);
        const memberId = m?._id;
        return Promise.all([
          memberId ? workoutApi.listPlans(memberId).catch(() => null) : null,
          gamificationApi.getMyProfile().catch(() => null),
        ]);
      })
      .then(([plansRes, gameRes]) => {
        if (plansRes) {
          const planList = Array.isArray(plansRes) ? plansRes : (plansRes as any)?.plans || [];
          if (planList.length > 0) {
            setActivePlan(planList[0]);
          }
        }
        if (gameRes) {
          setGameProfile(gameRes);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const memberName = memberProfile?.userId?.fullName || user?.fullName || "Member";
  const level = gameProfile?.level ?? 1;
  const streak = gameProfile?.currentStreakDays ?? 0;
  const totalXp = gameProfile?.totalXp ?? 0;
  const xpToNext = Math.pow(level, 2) * 100;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="font-display text-xl font-semibold text-(--color-text)">
          Hi {memberName} 👋
        </p>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-full border border-(--color-border) text-(--color-text-muted)">
          <Bell size={16} />
          <span className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-(--color-accent)" />
        </button>
      </div>

      <Card className="gradient-hero border-transparent">
        <div className="relative flex items-center justify-between mb-3">
          <p className="font-display text-lg font-semibold text-white">Level {level}</p>
          <span className="flex items-center gap-1 text-sm font-medium text-white/90">
            <Flame size={15} /> {streak} Day Streak
          </span>
        </div>
        <div className="relative">
          <ProgressBar
            value={totalXp}
            max={xpToNext}
            trackClassName="bg-white/25"
            className="bg-white"
          />
        </div>
        <p className="relative text-xs text-white/80 mt-2 font-mono">
          {totalXp.toLocaleString()} / {xpToNext.toLocaleString()} XP
        </p>
      </Card>

      <div>
        <p className="text-xs font-medium tracking-wide text-(--color-text-faint) uppercase mb-2">Today's Workout</p>
        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-6 text-sm text-(--color-text-muted) gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-(--color-accent)" /> Loading workout...
            </div>
          ) : activePlan ? (
            <>
              <p className="font-display text-lg font-semibold text-(--color-text)">{activePlan.title || activePlan.name}</p>
              <p className="text-sm text-(--color-text-muted) mt-1">{activePlan.description || "Personalized Routine"}</p>
              <p className="text-xs text-(--color-text-faint) mt-1">
                {activePlan.exercises?.length || 5} exercises · 45 min estimated
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-lg font-semibold text-(--color-text)">Full Body Conditioning</p>
              <p className="text-sm text-(--color-text-muted) mt-1">Strength & Hypertrophy Focus</p>
              <p className="text-xs text-(--color-text-faint) mt-1">5 exercises · 45 min estimated</p>
            </>
          )}

          <Link
            to="/member/workout-tracking"
            className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-(--color-accent) text-white text-sm font-semibold py-3"
          >
            Start workout <ChevronRight size={16} />
          </Link>
        </Card>
      </div>

      <div>
        <p className="text-xs font-medium tracking-wide text-(--color-text-faint) uppercase mb-2">My Fitness</p>
        <div className="grid grid-cols-2 gap-3">
          {memberQuickAccess.map((item) => (
            <QuickAccessCard key={item.path} {...item} />
          ))}
        </div>
      </div>

      {/* Refer & Earn Section */}
      <Card sweep className="border-(--color-accent)/25">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-(--color-accent-text)">Refer & Earn XP</p>
            <p className="text-sm font-bold text-(--color-text) mt-0.5">Invite Friends to Join</p>
            <p className="text-xs text-(--color-text-faint) mt-1 font-mono">
              Code: <span className="font-bold text-(--color-text) bg-(--color-surface-2) px-2 py-0.5 rounded-md">{memberProfile?.referralCode || "SPARTAN-REF"}</span>
            </p>
          </div>
          <button
            onClick={() => {
              const code = memberProfile?.referralCode || "SPARTAN-REF";
              navigator.clipboard.writeText(code);
              toast.success(`Referral code ${code} copied to clipboard!`);
            }}
            className="px-3.5 py-2 text-xs font-medium rounded-full bg-(--color-accent) text-white hover:opacity-90 transition-opacity"
          >
            Copy Code
          </button>
        </div>
      </Card>
    </div>
  );
}
