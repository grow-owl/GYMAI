import { useState, useEffect } from "react";
import { Search, Loader2, RefreshCw, Users } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { memberApi } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";

const statusTone: Record<string, "good" | "warn" | "danger" | "accent"> = {
  active: "good",
  ACTIVE: "good",
  expiring: "warn",
  EXPIRING: "warn",
  overdue: "danger",
  CANCELLED: "danger",
  trial: "accent",
  FROZEN: "accent",
};

export default function MemberSearch() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberList, setMemberList] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const fetchMembers = async () => {
    if (!user?.gymId || !user?.branchId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await memberApi.list(user.gymId, user.branchId);
      const list = Array.isArray(res) ? res : res?.members || [];
      setMemberList(list);
    } catch {
      setError("Failed to search members.");
      setMemberList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [user]);

  const filteredMembers = memberList.filter((m) => {
    const name = (m.name || m.fullName || m.userId?.fullName || "").toLowerCase();
    const phone = (m.phone || m.userId?.phone || "").toLowerCase();
    const qr = (m.qrCode || "").toLowerCase();
    const query = search.toLowerCase();
    return name.includes(query) || phone.includes(query) || qr.includes(query);
  });

  return (
    <div>
      <PageHeader title="Member Search" backTo="/reception" />
      <div className="flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface) px-4 py-2.5 text-sm text-(--color-text) mb-4">
        <Search size={15} className="text-(--color-text-faint)" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, or QR ID..."
          className="bg-transparent outline-none w-full placeholder:text-(--color-text-faint)"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-10 text-sm text-(--color-text-muted) gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-(--color-accent)" /> Loading members list...
        </div>
      ) : error ? (
        <Card className="text-center py-8">
          <p className="text-sm text-(--color-danger) mb-3">{error}</p>
          <button
            onClick={fetchMembers}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-full bg-(--color-surface-3) text-(--color-text)"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </Card>
      ) : filteredMembers.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-10 text-center">
          <Users className="w-8 h-8 text-(--color-text-faint) mb-2 opacity-50" />
          <p className="text-sm font-medium text-(--color-text)">No matching members found</p>
          <p className="text-xs text-(--color-text-faint) mt-1">Try refining your search term or check spelling.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredMembers.map((m) => {
            const name = m.name || m.fullName || m.userId?.fullName || "Member";
            const plan = m.plan || m.planName || "Monthly Plan";
            const status = m.membershipStatus || m.status || "ACTIVE";
            const phone = m.phone || m.userId?.phone || "—";

            return (
              <Card key={m._id || m.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-(--color-text)">{name}</p>
                  <p className="text-xs text-(--color-text-faint) mt-0.5">
                    {plan} · Phone: {phone}
                  </p>
                </div>
                <Badge tone={statusTone[status] || "good"}>{status}</Badge>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
