import { useState, useEffect } from "react";
import { Trophy, Flame, Loader2, RefreshCw, Flag } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { gamificationApi } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

export default function Gamification() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [lbRes, chRes] = await Promise.all([
        gamificationApi.getLeaderboard(user?.gymId).catch(() => null),
        gamificationApi.listChallenges(user?.gymId).catch(() => null),
      ]);

      const lbList = Array.isArray(lbRes) ? lbRes : lbRes?.leaderboard || [];
      setLeaderboard(lbList);

      const chList = Array.isArray(chRes) ? chRes : chRes?.challenges || [];
      setChallenges(chList);
    } catch {
      setError("Failed to load gamification data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleJoinChallenge = async (id: string) => {
    try {
      await gamificationApi.joinChallenge(id);
      toast.success("Joined challenge successfully!");
      fetchData();
    } catch {
      toast.error("Failed to join challenge.");
    }
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto w-full">
      <PageHeader title="Leaderboard & Challenges" subtitle="Compete with gym members" backTo="/member" />

      {loading ? (
        <Card className="flex items-center justify-center p-12 text-sm text-(--color-text-muted) gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-(--color-accent)" /> Loading leaderboard...
        </Card>
      ) : error ? (
        <Card className="text-center py-8">
          <p className="text-sm text-(--color-danger) mb-3">{error}</p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-full bg-(--color-surface-3) text-(--color-text)"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </Card>
      ) : (
        <>
          {/* Leaderboard Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-amber-400" />
              <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-faint)">Gym Leaderboard</p>
            </div>

            <Card className="p-0 overflow-hidden">
              {leaderboard.length === 0 ? (
                <div className="py-8 text-center text-xs text-(--color-text-faint) px-4">
                  No leaderboard rankings recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-(--color-border-soft)">
                  {leaderboard.map((item, index) => (
                    <div
                      key={item._id || index}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-(--color-surface-2) transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-(--color-text-muted) w-6">#{index + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-(--color-text)">{item.userName || item.name || "Member"}</p>
                          <p className="text-xs text-(--color-text-faint)">Level {item.level || 1}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Flame size={14} className="text-amber-400" />
                        <span className="font-mono text-sm font-semibold text-(--color-text)">
                          {(item.points || item.xp || 0).toLocaleString()} XP
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Active Challenges Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <Flag size={16} className="text-(--color-accent)" />
              <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-faint)">Active Challenges</p>
            </div>

            {challenges.length === 0 ? (
              <Card className="py-8 text-center text-xs text-(--color-text-faint)">
                No active challenges available right now.
              </Card>
            ) : (
              <div className="space-y-3">
                {challenges.map((c) => (
                  <Card key={c._id || c.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-(--color-text)">{c.title || c.name}</p>
                      <p className="text-xs text-(--color-text-faint) mt-0.5">{c.description || "Gym fitness challenge"}</p>
                    </div>
                    <button
                      onClick={() => handleJoinChallenge(c._id || c.id)}
                      className="px-3.5 py-1.5 text-xs font-medium rounded-full bg-(--color-accent) text-white hover:opacity-90"
                    >
                      Join Challenge
                    </button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
