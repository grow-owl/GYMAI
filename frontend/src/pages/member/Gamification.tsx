import * as icons from "lucide-react";
import { Trophy, Flame } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import Heatmap, { type HeatmapCell } from "@/components/ui/Heatmap";
import { gamification, gym } from "@/data/mock";

function buildStreakWeeks(streakDays: number): HeatmapCell[][] {
  const totalDays = 8 * 7;
  const weeks: HeatmapCell[][] = [];
  let dayIndex = 0;
  for (let w = 0; w < 8; w++) {
    const week: HeatmapCell[] = [];
    for (let d = 0; d < 7; d++) {
      const daysFromToday = totalDays - dayIndex;
      const active = daysFromToday <= streakDays ? 1 : Math.random() > 0.6 ? 1 : 0;
      week.push({ label: `Day ${dayIndex + 1}`, value: active });
      dayIndex += 1;
    }
    weeks.push(week);
  }
  return weeks;
}
const streakWeeks = buildStreakWeeks(gamification.streak);

export default function Gamification() {
  return (
    <div>
      <PageHeader title="Rewards" backTo="/member" />

      <Card sweep className="mb-4 border-(--color-accent)/25 text-center py-6">
        <p className="font-display text-2xl font-semibold text-(--color-accent-text)">LEVEL {gamification.level}</p>
        <p className="font-mono text-sm text-(--color-text-muted) mt-1">{gamification.xp.toLocaleString()} XP</p>
        <div className="max-w-xs mx-auto mt-3">
          <ProgressBar value={gamification.xp} max={gamification.xpToNext} />
        </div>
        <p className="text-xs text-(--color-text-faint) mt-2">{gamification.xpToNext - gamification.xp} XP to next level</p>
      </Card>

      <p className="text-xs font-medium tracking-wide text-(--color-text-faint) uppercase mb-3">Badges</p>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {gamification.badges.map((b) => {
          const Icon = (icons as unknown as Record<string, icons.LucideIcon>)[b.icon] ?? icons.Award;
          return (
            <Card key={b.label} className="flex flex-col items-center text-center gap-2 py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-(--color-accent-soft) text-(--color-accent-text)">
                <Icon size={18} />
              </span>
              <p className="text-[11px] text-(--color-text-muted) leading-tight">{b.label}</p>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Flame size={14} className="text-(--tone-orange-text)" />
        <p className="text-xs font-medium tracking-wide text-(--color-text-faint) uppercase">
          {gamification.streak} day streak
        </p>
      </div>
      <Card className="mb-5 overflow-x-auto">
        <Heatmap weeks={streakWeeks} />
      </Card>

      <p className="text-xs font-medium tracking-wide text-(--color-text-faint) uppercase mb-3">This month</p>
      <Card className="mb-5">
        <div className="grid grid-cols-3 text-center">
          {gamification.monthStats.map((s) => (
            <div key={s.label}>
              <p className="text-sm font-semibold text-(--color-text)">{s.value}</p>
              <p className="text-[10px] text-(--color-text-faint) mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex items-center gap-2 mb-3">
        <Trophy size={14} className="text-(--color-accent)" />
        <p className="text-xs font-medium tracking-wide text-(--color-text-faint) uppercase">{gym.name} Leaderboard</p>
      </div>
      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-(--color-border-soft)">
          {gamification.leaderboard.map((l) => (
            <div key={l.rank} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="w-5 text-sm font-mono text-(--color-text-faint)">{l.rank}</span>
                <span className="text-sm text-(--color-text)">{l.name}</span>
              </div>
              <span className="font-mono text-xs text-(--color-text-muted)">{l.xp}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
