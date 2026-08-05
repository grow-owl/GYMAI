import { useEffect, useMemo, useState } from "react";
import { Phone, MessageCircle, ArrowRightCircle, Plus, Loader2, RefreshCw, Target } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import CustomSelect from "@/components/ui/CustomSelect";
import { leadApi } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

interface LeadRow {
  _id: string;
  fullName: string;
  name?: string;
  phone: string;
  source?: string;
  status: string;
  interest?: string;
  trialDate?: string;
}

const stageOrder = ["NEW", "CONTACTED", "TRIAL", "CONVERTED"];

export default function ReceptionLeads() {
  const user = useAuthStore((s) => s.user);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead, setNewLead] = useState({
    fullName: "",
    phone: "",
    source: "Walk-in",
    interest: "Monthly Fitness",
  });

  const fetchLeads = async () => {
    if (!user?.gymId || !user?.branchId) {
      setError("Branch configuration missing.");
      setLeads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await leadApi.list(user.gymId, user.branchId);
      const list = Array.isArray(res) ? res : (res as any)?.leads || [];
      setLeads(list as LeadRow[]);
    } catch {
      setError("Failed to load leads from backend.");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [user]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (user?.gymId && user?.branchId) {
        await leadApi.create(user.gymId, user.branchId, { ...newLead, status: "NEW" });
      }
      toast.success(`Lead ${newLead.fullName} added successfully!`);
      setShowAddModal(false);
      fetchLeads();
    } catch {
      toast.error("Failed to add lead.");
    }
  };

  const handleAdvanceStage = async (lead: LeadRow) => {
    const currentIndex = stageOrder.indexOf(lead.status);
    const nextStatus = stageOrder[(currentIndex + 1) % stageOrder.length];

    setLeads((prev) =>
      prev.map((l) => (l._id === lead._id ? { ...l, status: nextStatus } : l))
    );
    toast.success(`Lead ${lead.fullName} status updated to ${nextStatus}`);

    try {
      if (user?.gymId && user?.branchId && !lead._id.startsWith("m")) {
        await leadApi.updateStatus(user.gymId, user.branchId, lead._id, nextStatus);
      }
    } catch {}
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
    <div>
      <PageHeader
        title="Leads & Trials"
        subtitle="Reception prospect pipeline & trial management"
        backTo="/reception"
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
            Add prospective gym members entering front-desk inquiries.
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
                  Interested: {l.interest || "General"} · Source: {l.source ?? "Walk-in"}
                </p>
                {l.trialDate && <p className="text-xs text-(--color-accent-text) mt-1">Trial: {l.trialDate}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`tel:${l.phone}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-(--color-border) text-(--color-text-muted) hover:text-(--color-text)"
                >
                  <Phone size={14} />
                </a>
                <a
                  href={`https://wa.me/${l.phone?.replace(/[^0-9]/g, "")}`}
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
        <Modal onClose={() => setShowAddModal(false)} maxWidth="md" title="Add Reception Prospect">
          <form onSubmit={handleAddLead} className="space-y-3">
            <div>
              <label className="text-xs text-(--color-text-muted)">Prospect Name</label>
              <input
                required
                value={newLead.fullName}
                onChange={(e) => setNewLead({ ...newLead, fullName: e.target.value })}
                className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                placeholder="e.g. Rahul Sharma"
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
            <CustomSelect
              label="Source"
              value={newLead.source}
              onChange={(v) => setNewLead({ ...newLead, source: v })}
              options={[
                { value: "Walk-in", label: "Walk-in Inquiry" },
                { value: "Phone Call", label: "Phone Inquiry" },
                { value: "Instagram Ad", label: "Instagram Ad" },
                { value: "Referral", label: "Member Referral" },
              ]}
            />
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
        </Modal>
      )}
    </div>
  );
}
