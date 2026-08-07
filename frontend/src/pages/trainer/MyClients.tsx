import { useState, useEffect } from "react";
import { Loader2, RefreshCw, Users, Star, MessageSquare } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { trainerApi, feedbackApi } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";

export default function MyClients() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [clientFeedbacks, setClientFeedbacks] = useState<Record<string, any[]>>({});

  const fetchClients = async () => {
    if (!user?.gymId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await trainerApi.getMyClients(user.gymId);
      const list = Array.isArray(res) ? res : res?.clients || [];
      setClients(list);

      // Fetch feedback for each client
      const feedbackMap: Record<string, any[]> = {};
      await Promise.all(
        list.map(async (c: any) => {
          const clientId = c._id || c.id;
          if (clientId) {
            try {
              const fbRes = await feedbackApi.list(clientId);
              const fbList = Array.isArray(fbRes) ? fbRes : fbRes?.feedback || fbRes?.data || [];
              feedbackMap[clientId] = fbList;
            } catch {
              feedbackMap[clientId] = [];
            }
          }
        })
      );
      setClientFeedbacks(feedbackMap);
    } catch {
      setError("Failed to load assigned clients.");
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [user]);

  return (
    <div className="space-y-4">
      <PageHeader title="My Clients" subtitle={`${clients.length} assigned`} backTo="/trainer" />

      {loading ? (
        <div className="flex items-center justify-center p-12 text-sm text-(--color-text-muted) gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-(--color-accent)" /> Loading assigned clients...
        </div>
      ) : error ? (
        <Card className="text-center py-8">
          <p className="text-sm text-(--color-danger) mb-3">{error}</p>
          <button
            onClick={fetchClients}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-full bg-(--color-surface-3) text-(--color-text)"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </Card>
      ) : clients.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="w-8 h-8 text-(--color-text-faint) mb-2 opacity-50" />
          <p className="text-sm font-medium text-(--color-text)">No assigned clients yet</p>
          <p className="text-xs text-(--color-text-faint) mt-1 max-w-xs">
            Members assigned to you by the gym manager will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {clients.map((c) => {
            const clientId = c._id || c.id;
            const name = c.userId?.fullName || c.name || "Client";
            const plan = c.planName || c.plan || "Membership";
            const status = c.membershipStatus || c.status || "ACTIVE";
            const initials = name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .slice(0, 2);

            const feedbacks = clientFeedbacks[clientId] || [];

            return (
              <Card key={clientId} className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--color-surface-3) text-sm font-semibold text-(--color-text)">
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-(--color-text) truncate">{name}</p>
                      <p className="text-xs text-(--color-text-faint) truncate">{plan}</p>
                    </div>
                  </div>
                  {status === "FROZEN" || c.churnRisk === "high" ? (
                    <Badge tone="danger" className="self-start sm:self-auto shrink-0">Needs attention</Badge>
                  ) : (
                    <Badge tone="good" className="self-start sm:self-auto shrink-0">On track</Badge>
                  )}
                </div>

                {/* Feedback section */}
                <div className="pt-2 border-t border-(--color-border-soft) space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-(--color-text-muted) font-medium">
                    <MessageSquare size={13} className="text-(--color-accent)" />
                    <span>Client Feedback ({feedbacks.length})</span>
                  </div>

                  {feedbacks.length === 0 ? (
                    <p className="text-xs text-(--color-text-faint) italic">No feedback submitted yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {feedbacks.map((fb: any, idx: number) => (
                        <div key={fb._id || idx} className="p-2.5 rounded-xl bg-(--color-surface-2) text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-amber-400">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={12}
                                  fill={star <= (fb.rating || 5) ? "currentColor" : "none"}
                                />
                              ))}
                              <span className="text-[11px] font-semibold text-(--color-text) ml-1">
                                {fb.rating || 5}/5
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-(--color-text-faint)">
                                {new Date(fb.createdAt || Date.now()).toLocaleDateString()}
                              </span>
                              <button
                                onClick={async () => {
                                  const fbId = fb._id || fb.id;
                                  if (!fbId) return;
                                  try {
                                    await feedbackApi.delete(fbId);
                                    fetchClients();
                                  } catch (err) {
                                    console.warn("Failed to delete feedback:", err);
                                  }
                                }}
                                className="text-rose-400 hover:text-rose-300 text-[10px] cursor-pointer"
                                title="Delete Feedback"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <p className="text-(--color-text) text-xs leading-relaxed">{fb.note}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
