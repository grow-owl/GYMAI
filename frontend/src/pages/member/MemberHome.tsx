import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Shield, AlertCircle } from "lucide-react";
import { memberApi, progressApi, attendanceApi, paymentApi, workoutApi } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { showApiErrorToast } from "@/lib/api";
import PerformanceCharts from "@/components/member/PerformanceCharts";
import ConsistencyProgressTracker from "@/components/member/ConsistencyProgressTracker";
import LeaderboardCard from "@/components/member/LeaderboardCard";
import WorkoutDietOverview from "@/components/member/WorkoutDietOverview";
import QuickActionDrawer from "@/components/member/QuickActionDrawer";

export default function MemberHome() {
  const user = useAuthStore((s) => s.user);
  
  // Primary States
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [memberProfile, setMemberProfile] = useState<any | null>(null);
  const [weightLogs, setWeightLogs] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<any | null>(null);
  const [completedWorkoutsCount, setCompletedWorkoutsCount] = useState<number>(0);
  const [workoutVolumeLogs, setWorkoutVolumeLogs] = useState<any[]>([]);
  const [, setMyPayment] = useState<any | null>(null);
  const [activePlanName, setActivePlanName] = useState<string | null>(null);

  // Modal State
  const [activeModal, setActiveModal] = useState<"weight" | "feedback" | "privacy" | "referral" | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setProfileError(null);
    try {
      // 1. Get Self Member Profile
      const profRes = await memberApi.getSelfProfile().catch(() => null);
      const m = profRes?.member;
      if (m) setMemberProfile(m);

      const memberId = m?._id || user?._id;
      const gymId = m?.gymId || user?.gymId;
      const branchId = m?.branchId || user?.branchId;

      if (!gymId || !branchId) {
        setProfileError("Couldn't load your profile — please try logging in again.");
      }

      // 2. Fetch parallel endpoints
      const [weightRes, attStatsRes, payRes, workoutStatsRes] = await Promise.all([
        memberId ? progressApi.getHistory(memberId).catch(() => null) : null,
        attendanceApi.getMyStats().catch(() => null),
        gymId ? paymentApi.getMyPayments(gymId).catch(() => null) : null,
        memberId ? workoutApi.getCompletionStats(memberId).catch(() => null) : null,
      ]);

      if (weightRes) {
        const logs = Array.isArray(weightRes) ? weightRes : weightRes?.history || weightRes?.logs || [];
        setWeightLogs(logs);
      }
      if (attStatsRes) setAttendanceStats(attStatsRes);
      if (payRes) setMyPayment(payRes);
      if (workoutStatsRes) {
        const stats = workoutStatsRes?.stats || workoutStatsRes;
        const count = stats?.totalWorkoutSessions ?? 0;
        setCompletedWorkoutsCount(count);
        if (stats?.weeklyVolumeLogs && Array.isArray(stats.weeklyVolumeLogs)) {
          setWorkoutVolumeLogs(stats.weeklyVolumeLogs);
        }
      }

      if (memberId) {
        const planRes = await workoutApi.getActivePlan(memberId).catch(() => null);
        const plan = planRes?.plan || planRes;
        if (plan && (plan.name || plan.title)) {
          setActivePlanName(plan.title || plan.name);
        } else {
          setActivePlanName(null);
        }
      }

    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      showApiErrorToast(err, "Failed to refresh dashboard data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const memberName = memberProfile?.userId?.fullName || user?.fullName || "Gym Member";
  const referralCode = memberProfile?.referralCode || "";
  const gymId = memberProfile?.gymId || user?.gymId || "";
  
  const rawBranch = memberProfile?.branchId;
  const branchName = (typeof rawBranch === "object" && rawBranch !== null ? rawBranch.name : user?.branchName) || "";
  const memberId = memberProfile?._id || user?._id || "";

  if (!loading && profileError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-(--color-surface) rounded-2xl border border-(--color-border) text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-amber-400 animate-bounce" />
        <h2 className="text-lg font-bold text-(--color-text)">Profile Load Error</h2>
        <p className="text-xs text-(--color-text-muted) max-w-md">{profileError}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 rounded-xl bg-(--color-accent) text-white text-xs font-bold"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome Header Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-(--color-border) shadow-xs transition-all hover:border-(--color-border-soft)">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Member Info Left */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 font-display text-xl font-extrabold text-white shadow-sm ring-2 ring-amber-400/30 shrink-0">
              {memberName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-base sm:text-lg font-extrabold text-(--color-text) truncate">
                  Welcome Back, {memberName}! 👋
                </h1>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                  ACTIVE MEMBER
                </span>
                {branchName && (
                  <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    📍 {branchName}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                {activePlanName ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-bold text-[11px] flex items-center gap-1">
                    🎯 Today's Focus: <span className="font-semibold text-amber-950">{activePlanName}</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium text-[11px]">
                    🛋️ Rest & Recovery Day
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats & Action Right */}
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t lg:border-t-0 border-(--color-border-soft) pt-3 lg:pt-0">
            <div className="flex items-center gap-2.5 sm:gap-3 bg-(--color-surface-2) p-1.5 px-3 rounded-xl border border-(--color-border-soft)">
              <div className="flex items-center gap-1 text-xs">
                <span className="text-sm">🔥</span>
                <div>
                  <span className="text-[9px] text-(--color-text-faint) block uppercase font-bold leading-none">Streak</span>
                  <span className="font-mono text-xs font-bold text-(--color-text)">
                    {attendanceStats?.currentStreak ?? memberProfile?.currentStreakDays ?? 0}d
                  </span>
                </div>
              </div>
              <span className="text-(--color-border) text-xs">|</span>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-sm">⭐</span>
                <div>
                  <span className="text-[9px] text-(--color-text-faint) block uppercase font-bold leading-none">Rank</span>
                  <span className="font-mono text-xs font-bold text-amber-600">
                    Lvl {memberProfile?.gamificationLevel ?? 1}
                  </span>
                </div>
              </div>
            </div>

            <Link
              to="/member/attendance"
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-(--color-accent) hover:brightness-105 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Shield className="h-4 w-4" /> Check-In
            </Link>
          </div>
        </div>
      </div>

      {/* SECTION 1: Today's Workout & Active Diet Plan Overview (HERO SECTION) */}
      <WorkoutDietOverview memberId={memberId} />

      {/* SECTION 2: Performance & Progress Charts */}
      <PerformanceCharts
        memberId={memberId}
        weightLogs={weightLogs}
        targetWeightKg={memberProfile?.healthInfo?.targetWeight_kg || memberProfile?.targetWeightKg}
        attendanceStats={attendanceStats}
        workoutVolumeLogs={workoutVolumeLogs}
        onLogWeightClick={() => setActiveModal("weight")}
        isLoading={loading}
      />

      {/* SECTION 3: Consistency Tracker & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <ConsistencyProgressTracker
            attendanceStats={attendanceStats}
            workoutVolumeLogs={workoutVolumeLogs}
            completedWorkoutsCount={completedWorkoutsCount}
          />
        </div>
        <div className="lg:col-span-5">
          <LeaderboardCard gymId={gymId} currentUserId={memberId} />
        </div>
      </div>

      {/* Quick Action Drawer Modal */}
      <QuickActionDrawer
        type={activeModal}
        onClose={() => setActiveModal(null)}
        memberId={memberId}
        referralCode={referralCode}
        onWeightSuccess={fetchDashboardData}
      />
    </div>
  );
}
