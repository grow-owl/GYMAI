import { useState, useEffect } from "react";
import { Loader2, RefreshCw, Users } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { trainerApi } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";

export default function MyClients() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);

  const fetchClients = async () => {
    if (!user?.gymId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await trainerApi.getMyClients(user.gymId);
      const list = Array.isArray(res) ? res : res?.clients || [];
      setClients(list);
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
    <div>
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
        <div className="space-y-3">
          {clients.map((c) => {
            const name = c.userId?.fullName || c.name || "Client";
            const plan = c.planName || c.plan || "Membership";
            const status = c.membershipStatus || c.status || "ACTIVE";
            const initials = name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .slice(0, 2);

            return (
              <Card key={c._id || c.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-(--color-surface-3) text-sm font-semibold text-(--color-text)">
                    {initials}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-(--color-text)">{name}</p>
                    <p className="text-xs text-(--color-text-faint)">{plan}</p>
                  </div>
                </div>
                {status === "FROZEN" || c.churnRisk === "high" ? (
                  <Badge tone="danger">Needs attention</Badge>
                ) : (
                  <Badge tone="good">On track</Badge>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
