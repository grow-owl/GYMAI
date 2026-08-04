import { useEffect, useMemo, useState } from "react";
import { Phone, MessageCircle, ArrowRightCircle, Loader2, AlertTriangle } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { useGymBranch } from "@/hooks/useGymBranch";
import { leadApi } from "@/lib/endpoints";

interface LeadRow {
  _id: string;
  fullName: string;
  phone: string;
  source?: string;
  status: string;
  interest?: string;
}

const stageOrder = ["NEW", "CONTACTED", "TRIAL", "JOINED"];

export default function Leads() {
  const { gymId, branchId, loading: resolvingBranch, error: branchError } = useGymBranch();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gymId || !branchId) return;
    setLoading(true);
    leadApi
      .list(gymId, branchId)
      .then((res) => setLeads(Array.isArray(res) ? (res as LeadRow[]) : []))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load leads"))
      .finally(() => setLoading(false));
  }, [gymId, branchId]);

  const pipeline = useMemo(
    () =>
      stageOrder.map((stage) => ({
        stage: stage.charAt(0) + stage.slice(1).toLowerCase(),
        count: leads.filter((l) => l.status === stage).length,
      })),
    [leads]
  );

  return (
    <div>
      <PageHeader title="Lead Pipeline" subtitle="New visitors → members" backTo="/owner" />

      <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-5">
        {pipeline.map((s) => (
          <Card key={s.stage} className="text-center py-4">
            <p className="font-display text-xl sm:text-2xl font-semibold text-(--color-text)">{s.count}</p>
            <p className="text-[11px] text-(--color-text-faint) mt-1 uppercase tracking-wide">{s.stage}</p>
          </Card>
        ))}
      </div>

      {(resolvingBranch || loading) && (
        <div className="flex items-center gap-2 text-sm text-(--color-text-faint) py-10 justify-center">
          <Loader2 size={16} className="animate-spin" /> Loading leads…
        </div>
      )}

      {(branchError || error) && !loading && !resolvingBranch && (
        <div className="flex items-center gap-2 text-sm text-(--color-danger) py-10 justify-center">
          <AlertTriangle size={16} /> {branchError || error}
        </div>
      )}

      {!resolvingBranch && !loading && !error && !branchError && leads.length === 0 && (
        <p className="text-sm text-(--color-text-faint) py-10 text-center">No leads yet.</p>
      )}

      <div className="space-y-3">
        {leads.map((l) => (
          <Card key={l._id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-(--color-text)">{l.fullName}</p>
              <p className="text-xs text-(--color-text-faint) mt-0.5">
                {l.interest ? `Interested: ${l.interest} · ` : ""}Source: {l.source ?? "—"}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`tel:${l.phone}`}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-(--color-border) text-(--color-text-muted)"
              >
                <Phone size={14} />
              </a>
              <a
                href={`https://wa.me/${l.phone.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-(--color-border) text-(--color-text-muted)"
              >
                <MessageCircle size={14} />
              </a>
              <button className="flex h-8 w-8 items-center justify-center rounded-full bg-(--color-accent) text-white">
                <ArrowRightCircle size={14} />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}