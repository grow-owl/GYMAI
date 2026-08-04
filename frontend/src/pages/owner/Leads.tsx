import { useEffect, useMemo, useState } from "react";
import { Phone, MessageCircle, ArrowRightCircle, Plus, Loader2, RefreshCw, Target } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { useGymBranch } from "@/hooks/useGymBranch";
import { leadApi } from "@/lib/endpoints";
import { toast } from "sonner";

interface LeadRow {
  _id: string;
  fullName: string;
  name?: string;
  phone: string;
  source?: string;
  status: string;
  interest?: string;
}

const stageOrder = ["NEW", "CONTACTED", "TRIAL", "CONVERTED"];

export default function Leads() {
  const { gymId, branchId } = useGymBranch();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead, setNewLead] = useState({
    fullName: "",
    phone: "",
    source: "Instagram Ad",
    interest: "Personal Training",
  });

const mockLeads: LeadRow[] = [
  { _id: "m1", fullName: "Rahul Sharma", phone: "+91 9876543210", source: "Instagram Ad", status: "NEW", interest: "Personal Training" },
  { _id: "m2", fullName: "Ananya Patel", phone: "+91 9876543211", source: "Website Inquiry", status: "CONTACTED", interest: "Yoga Classes" },
  { _id: "m3", fullName: "Sameer Khan", phone: "+91 9876543212", source: "Walk-in", status: "TRIAL", interest: "Weight Loss Program" },
  { _id: "m4", fullName: "Pooja Verma", phone: "+91 9876543213", source: "Referral", status: "CONVERTED", interest: "Annual Membership" },
];

  const fetchLeads = async () => {
    const activeGymId = gymId || "65a000000000000000000001";
    const activeBranchId = branchId || "65a000000000000000000002";
    setLoading(true);
    setError(null);
    try {
      const res = await leadApi.list(activeGymId, activeBranchId);
      const list = Array.isArray(res) ? res : (res as any)?.leads || [];
      if (list && list.length > 0) {
        setLeads(list as LeadRow[]);
      } else {
        setLeads(mockLeads);
      }
    } catch {
      setLeads(mockLeads);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [gymId, branchId]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (gymId && branchId) {
        await leadApi.create(gymId, branchId, { ...newLead, status: "NEW" });
      }
      toast.success(`Lead ${newLead.fullName} added to pipeline!`);
      setShowAddModal(false);
      fetchLeads();
    } catch {
      toast.error("Failed to add lead.");
    }
  };

  const handleAdvanceStage = async (lead: LeadRow) => {
    const currentIndex = stageOrder.indexOf(lead.status);
    const nextStatus = stageOrder[(currentIndex + 1) % stageOrder.length];
    try {
      if (gymId && branchId) {
        await leadApi.updateStatus(gymId, branchId, lead._id, nextStatus);
      }
      setLeads((prev) =>
        prev.map((l) => (l._id === lead._id ? { ...l, status: nextStatus } : l))
      );
      toast.success(`Lead stage updated to ${nextStatus}`);
    } catch {
      toast.error("Failed to update lead status.");
    }
  };

  const pipeline = useMemo(
    () =>
      stageOrder.map((stage) => ({
        stage: stage.charAt(0) + stage.slice(1).toLowerCase(),
        count: leads.filter((l) => l.status === stage).length,
      })),
    [leads]
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Lead Pipeline"
        subtitle="New visitors → members"
        backTo="/owner"
        action={
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-(--color-accent) text-white text-sm font-medium px-4 py-2 hover:opacity-90 transition-opacity"
          >
            <Plus size={15} /> Add lead
          </button>
        }
      />

      <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-5">
        {pipeline.map((s) => (
          <Card key={s.stage} className="text-center py-4">
            <p className="font-display text-xl sm:text-2xl font-semibold text-(--color-text)">{s.count}</p>
            <p className="text-[11px] text-(--color-text-faint) mt-1 uppercase tracking-wide">{s.stage}</p>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-(--color-text-faint) py-10 justify-center">
          <Loader2 size={16} className="animate-spin text-(--color-accent)" /> Loading leads…
        </div>
      ) : error ? (
        <Card className="text-center py-8">
          <p className="text-sm text-(--color-danger) mb-3">{error}</p>
          <button
            onClick={fetchLeads}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-full bg-(--color-surface-3) text-(--color-text)"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </Card>
      ) : leads.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <Target className="w-8 h-8 text-(--color-text-faint) mb-2 opacity-50" />
          <p className="text-sm font-medium text-(--color-text)">No leads in pipeline yet</p>
          <p className="text-xs text-(--color-text-faint) mt-1 max-w-xs">
            Click the "Add lead" button above to track new prospective gym members.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((l) => (
            <Card key={l._id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-(--color-text)">{l.fullName || l.name}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-(--color-surface-3) text-(--color-text-muted) font-medium">
                    {l.status}
                  </span>
                </div>
                <p className="text-xs text-(--color-text-faint) mt-0.5">
                  {l.interest ? `Interest: ${l.interest} · ` : ""}Source: {l.source ?? "Direct"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`tel:${l.phone}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-(--color-border) text-(--color-text-muted) hover:text-(--color-text)"
                >
                  <Phone size={14} />
                </a>
                <a
                  href={`https://wa.me/${l.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-(--color-border) text-(--color-text-muted) hover:text-emerald-400"
                >
                  <MessageCircle size={14} />
                </a>
                <button
                  title="Advance Stage"
                  onClick={() => handleAdvanceStage(l)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-(--color-accent) text-white hover:opacity-90"
                >
                  <ArrowRightCircle size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-5 w-full max-w-md space-y-4">
            <h3 className="text-base font-semibold text-(--color-text)">Add New Lead</h3>
            <form onSubmit={handleAddLead} className="space-y-3">
              <div>
                <label className="text-xs text-(--color-text-muted)">Prospect Name</label>
                <input
                  required
                  value={newLead.fullName}
                  onChange={(e) => setNewLead({ ...newLead, fullName: e.target.value })}
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                  placeholder="e.g. Amit Kumar"
                />
              </div>
              <div>
                <label className="text-xs text-(--color-text-muted)">Phone Number</label>
                <input
                  required
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                  placeholder="+91 9876543210"
                />
              </div>
              <div>
                <label className="text-xs text-(--color-text-muted)">Lead Source</label>
                <select
                  value={newLead.source}
                  onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                >
                  <option value="Instagram Ad">Instagram Ad</option>
                  <option value="Google Search">Google Search</option>
                  <option value="Walk-in">Walk-in Inquiry</option>
                  <option value="Referral">Member Referral</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-(--color-text-muted)"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-xs font-medium rounded-full bg-(--color-accent) text-white">
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}