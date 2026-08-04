import { Link } from "react-router-dom";
import { Bell, Flame, ChevronRight } from "lucide-react";
import QuickAccessCard from "@/components/ui/QuickAccessCard";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import { gym, gamification, todaysWorkout, memberQuickAccess } from "@/data/mock";

export default function MemberHome() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="font-display text-xl font-semibold text-(--color-text)">Hi {gym.memberName} 👋</p>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-full border border-(--color-border) text-(--color-text-muted)">
          <Bell size={16} />
          <span className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-(--color-accent)" />
        </button>
      </div>

      <Card className="gradient-hero border-transparent">
        <div className="relative flex items-center justify-between mb-3">
          <p className="font-display text-lg font-semibold text-white">Level {gamification.level}</p>
          <span className="flex items-center gap-1 text-sm font-medium text-white/90">
            <Flame size={15} /> {gamification.streak} Day Streak
          </span>
        </div>
        <div className="relative">
          <ProgressBar
            value={gamification.xp}
            max={gamification.xpToNext}
            trackClassName="bg-white/25"
            className="bg-white"
          />
        </div>
        <p className="relative text-xs text-white/80 mt-2 font-mono">
          {gamification.xp.toLocaleString()} / {gamification.xpToNext.toLocaleString()} XP
        </p>
      </Card>

      <div>
        <p className="text-xs font-medium tracking-wide text-(--color-text-faint) uppercase mb-2">Today's Workout</p>
        <Card>
          <p className="font-display text-lg font-semibold text-(--color-text)">{todaysWorkout.name}</p>
          <p className="text-sm text-(--color-text-muted) mt-1">{todaysWorkout.focus}</p>
          <p className="text-xs text-(--color-text-faint) mt-1">
            {todaysWorkout.exerciseCount} exercises · {todaysWorkout.estMinutes} min estimated
          </p>
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
    </div>
  );
}
