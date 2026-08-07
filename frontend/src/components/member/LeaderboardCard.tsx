import { useState, useEffect } from "react";
import { Trophy, Flame, Shield, Loader2 } from "lucide-react";
import Card from "@/components/ui/Card";
import { gamificationApi } from "@/lib/endpoints";

interface LeaderboardCardProps {
  gymId?: string;
  currentUserId?: string;
}

interface LeaderboardEntry {
  _id?: string;
  rank?: number;
  fullName?: string;
  name?: string;
  totalXp?: number;
  level?: number;
  currentStreakDays?: number;
  avatarUrl?: string;
  isCurrentUser?: boolean;
}

export default function LeaderboardCard({ gymId, currentUserId }: LeaderboardCardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"xp" | "streak" | "score">("xp");

  useEffect(() => {
    setLoading(true);
    gamificationApi
      .getLeaderboard(gymId)
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.leaderboard || [];
        const enriched = list.map((item: any) => ({
          ...item,
          isCurrentUser:
            item.isCurrentUser ||
            Boolean(
              currentUserId &&
                (item._id === currentUserId ||
                  item.memberId === currentUserId ||
                  item.userId === currentUserId)
            ),
        }));
        setLeaderboard(enriched);
      })
      .catch(() => {
        setLeaderboard([]);
      })
      .finally(() => setLoading(false));
  }, [gymId, currentUserId]);


  return (
    <Card className="relative overflow-hidden border border-(--color-border) bg-(--color-surface) p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-(--color-text)">
              Gym Leaderboard
            </h3>
            <p className="text-xs text-(--color-text-muted)">
              Top performers ranked by total XP & streak
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-(--color-surface-2) p-1 rounded-xl border border-white/5 self-start sm:self-auto text-xs">
          <button
            onClick={() => setFilter("xp")}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              filter === "xp" ? "bg-(--color-accent) text-white" : "text-(--color-text-muted)"
            }`}
          >
            Total XP
          </button>
          <button
            onClick={() => setFilter("streak")}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              filter === "streak" ? "bg-(--color-accent) text-white" : "text-(--color-text-muted)"
            }`}
          >
            Streak
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-xs text-(--color-text-muted) gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-(--color-accent)" /> Fetching leaderboard...
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-8 text-xs text-(--color-text-muted)">
          No members on leaderboard yet. Check in to earn XP and rank up!
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.slice(0, 6).map((user, idx) => {
            const rank = user.rank || idx + 1;
            const name = user.fullName || user.name || "Gym Member";
            const xp = user.totalXp ?? 0;
            const streak = user.currentStreakDays ?? 0;
            const level = user.level ?? 1;

            let rankBadge = <span className="font-extrabold text-xs text-(--color-text-muted)">#{rank}</span>;
            if (rank === 1) rankBadge = <span className="text-lg">🥇</span>;
            if (rank === 2) rankBadge = <span className="text-lg">🥈</span>;
            if (rank === 3) rankBadge = <span className="text-lg">🥉</span>;

            return (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  user.isCurrentUser
                    ? "bg-gradient-to-r from-accent/20 to-purple-600/20 border-accent/40 shadow-md"
                    : "bg-(--color-surface-2)/40 border-white/5 hover:border-white/10"
                }`}
              >
                {/* Left: Rank & User Profile */}
                <div className="flex items-center gap-3">
                  <div className="w-6 text-center">{rankBadge}</div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 font-bold text-xs text-white">
                    {name.charAt(0)}
                  </div>

                  <div>
                    <p className="font-display text-xs font-bold text-(--color-text) flex items-center gap-1.5">
                      {name}
                      {user.isCurrentUser && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-accent text-white uppercase">
                          YOU
                        </span>
                      )}
                    </p>
                    <span className="text-[11px] text-(--color-text-muted) flex items-center gap-1">
                      <Shield className="h-3 w-3 text-indigo-400" /> Level {level} Lifter
                    </span>
                  </div>
                </div>

                {/* Right: Stats */}
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-xs font-extrabold text-(--color-text) font-mono">{xp.toLocaleString()} XP</p>
                    <p className="text-[10px] text-amber-400 font-semibold flex items-center justify-end gap-0.5">
                      <Flame className="h-3 w-3" /> {streak}d streak
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
