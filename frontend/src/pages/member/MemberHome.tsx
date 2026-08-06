import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Bell, Scale, MessageSquare, Shield, Share2, AlertCircle } from "lucide-react";
import { memberApi, progressApi, gamificationApi, attendanceApi, notificationApi, paymentApi, workoutApi } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { deriveGameStats } from "@/lib/gamification";
import FitnessScoreGauge from "@/components/member/FitnessScoreGauge";
import PerformanceCharts from "@/components/member/PerformanceCharts";
import StreakGamificationHub from "@/components/member/StreakGamificationHub";
import LeaderboardCard from "@/components/member/LeaderboardCard";
import WorkoutDietOverview from "@/components/member/WorkoutDietOverview";
import QuickActionDrawer from "@/components/member/QuickActionDrawer";

export default function MemberHome() {
  const user = useAuthStore((s) => s.user);
  
  // Primary States
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [memberProfile, setMemberProfile] = useState<any | null>(null);
  const [gameProfile, setGameProfile] = useState<any | null>(null);
  const [weightLogs, setWeightLogs] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<any | null>(null);
  const [completedWorkoutsCount, setCompletedWorkoutsCount] = useState<number>(0);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [, setMyPayment] = useState<any | null>(null);

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
      const [gameRes, weightRes, attStatsRes, unreadRes, payRes, workoutStatsRes] = await Promise.all([
        gamificationApi.getMyProfile().catch(() => null),
        memberId ? progressApi.getHistory(memberId).catch(() => null) : null,
        attendanceApi.getMyStats().catch(() => null),
        notificationApi.getUnreadCount().catch(() => null),
        gymId ? paymentApi.getMyPayments(gymId).catch(() => null) : null,
        memberId ? workoutApi.getCompletionStats(memberId).catch(() => null) : null,
      ]);

      if (gameRes) setGameProfile(gameRes);
      if (weightRes) {
        const logs = Array.isArray(weightRes) ? weightRes : weightRes?.history || weightRes?.logs || [];
        setWeightLogs(logs);
      }
      if (attStatsRes) setAttendanceStats(attStatsRes);
      if (unreadRes) setUnreadNotifications(unreadRes?.unreadCount || 0);
      if (payRes) setMyPayment(payRes);
      if (workoutStatsRes) {
        const count = workoutStatsRes?.stats?.totalWorkoutSessions ?? workoutStatsRes?.totalWorkoutSessions ?? 0;
        setCompletedWorkoutsCount(count);
      }

    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const memberName = memberProfile?.userId?.fullName || user?.fullName || "Gym Member";
  const gameStats = deriveGameStats(gameProfile);
  const streakDays = gameStats.streak || attendanceStats?.currentStreak || 0;
  const attendanceRate = attendanceStats?.attendanceRate ?? 0;
  const totalXp = gameStats.totalXp;
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-(--color-surface) p-4 sm:p-5 rounded-2xl border border-(--color-border) shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-accent to-purple-600 font-display text-xl font-bold text-white shadow-lg">
            {memberName.charAt(0)}
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] text-black font-extrabold">
              ★
            </span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-extrabold text-(--color-text)">
                Welcome Back, {memberName}! 👋
              </h1>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ACTIVE MEMBER
              </span>
              {branchName && (
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  📍 {branchName}
                </span>
              )}
            </div>
            <p className="text-xs text-(--color-text-muted) mt-0.5 flex items-center gap-2">
              <span>{streakDays} Day Workout Streak 🔥</span>
              <span>•</span>
              <span>Level {gameStats.level} Spartan</span>
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveModal("weight")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-(--color-text) border border-white/10 transition-all"
          >
            <Scale className="h-4 w-4 text-indigo-400" /> Log Weight
          </button>

          <button
            onClick={() => setActiveModal("referral")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-(--color-text) border border-white/10 transition-all"
          >
            <Share2 className="h-4 w-4 text-emerald-400" /> Refer & Earn
          </button>

          <button
            onClick={() => setActiveModal("feedback")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-(--color-text) border border-white/10 transition-all"
          >
            <MessageSquare className="h-4 w-4 text-amber-400" /> Feedback
          </button>

          <button
            onClick={() => setActiveModal("privacy")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-(--color-text) border border-white/10 transition-all"
            title="Privacy & Data Export"
          >
            <Shield className="h-4 w-4 text-purple-400" /> Export Data
          </button>

          <Link
            to="/member/notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-(--color-text) hover:bg-white/10 transition-all"
          >
            <Bell className="h-4 w-4" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                {unreadNotifications}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* SECTION 1: AI Performance Score Gauge */}
      <FitnessScoreGauge
        attendanceRate={attendanceRate}
        streakDays={streakDays}
        completedWorkoutsCount={completedWorkoutsCount}
        weightLogs={weightLogs}
        hasWeightLogs={weightLogs.length > 0}
        totalXp={totalXp}
        onRefresh={fetchDashboardData}
        isLoading={loading}
      />

      {/* SECTION 2: Performance & Progress Charts */}
      <PerformanceCharts
        weightLogs={weightLogs}
        targetWeightKg={memberProfile?.targetWeightKg}
        attendanceStats={attendanceStats}
        onLogWeightClick={() => setActiveModal("weight")}
        isLoading={loading}
      />

      {/* SECTION 3: Gamification Hub & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <StreakGamificationHub
            gameProfile={gameProfile}
            gameStats={gameStats}
            onProfileUpdate={fetchDashboardData}
          />
        </div>
        <div className="lg:col-span-5">
          <LeaderboardCard gymId={gymId} currentUserId={memberId} />
        </div>
      </div>

      {/* SECTION 4: Today's Workout & Active Diet Plan Overview */}
      <WorkoutDietOverview memberId={memberId} />

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
