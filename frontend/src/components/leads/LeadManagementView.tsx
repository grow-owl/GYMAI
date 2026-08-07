import { useState, useEffect } from "react";
import { Plus, Target, Loader2, RefreshCw, UserCheck, MessageSquarePlus, Pencil, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import CustomSelect from "@/components/ui/CustomSelect";
import Modal from "@/components/ui/Modal";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { leadApi } from "@/lib/endpoints";
import { useGymBranch } from "@/hooks/useGymBranch";
import { toast } from "sonner";

const statusTone: Record<string, "accent" | "warn" | "good" | "danger" | "neutral"> = {
  NEW: "accent",
  CONTACTED: "warn",
  TRIAL_SCHEDULED: "warn",
  TRIAL_COMPLETED: "good",
  CONVERTED: "good",
  LOST: "danger",
};

const leadStatusOptions = [
  { value: "NEW", label: "NEW" },
  { value: "CONTACTED", label: "CONTACTED" },
  { value: "TRIAL_SCHEDULED", label: "TRIAL_SCHEDULED" },
  { value: "TRIAL_COMPLETED", label: "TRIAL_COMPLETED" },
  { value: "CONVERTED", label: "CONVERTED" },
  { value: "LOST", label: "LOST" },
];

interface LeadManagementViewProps {
  backTo?: string;
  roleTitle?: string;
}

export default function LeadManagementView({ backTo = "/owner", roleTitle }: LeadManagementViewProps) {
  const { gymId, branchId, loading: resolvingBranch } = useGymBranch();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editLead, setEditLead] = useState({
    id: "",
    fullName: "",
    phone: "",
    email: "",
    source: "Website Inquiry",
    status: "NEW",
  });

  // Note Modal State
  const [noteLeadId, setNoteLeadId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  const [newLead, setNewLead] = useState({
    fullName: "",
    phone: "",
    email: "",
    source: "Website Inquiry",
  });

  const fetchLeads = async () => {
    if (!gymId || !branchId) {
      setLeads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await leadApi.list(gymId, branchId);
      const list = Array.isArray(res) ? res : (res as any)?.leads || [];
      setLeads(list);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [gymId, branchId]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeGymId = gymId || "";
    const activeBranchId = branchId || "";
    setSubmittingAdd(true);
    try {
      await leadApi.create(activeGymId, activeBranchId, newLead);
      toast.success(`Lead ${newLead.fullName} registered!`);
      setShowAddModal(false);
      setNewLead({ fullName: "", phone: "", email: "", source: "Website Inquiry" });
      fetchLeads();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || err.message || "Failed to add lead.");
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleEditLead = (lead: any) => {
    setEditLead({
      id: lead._id || lead.id,
      fullName: lead.fullName || "",
      phone: lead.phone || "",
      email: lead.email || "",
      source: lead.source || "Website Inquiry",
      status: lead.status || "NEW",
    });
    setShowEditModal(true);
  };

  const handleUpdateLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLead.id) return;
    setSubmittingEdit(true);
    try {
      await leadApi.update(editLead.id, {
        fullName: editLead.fullName,
        phone: editLead.phone,
        email: editLead.email,
        source: editLead.source,
        status: editLead.status,
      });
      toast.success(`Lead ${editLead.fullName} updated successfully!`);
      setShowEditModal(false);
      fetchLeads();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to update lead.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteLead = async (leadId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete sales lead "${name}"?`)) return;
    try {
      await leadApi.delete(leadId);
      toast.success(`Lead "${name}" deleted.`);
      fetchLeads();
    } catch {
      toast.error("Failed to delete sales lead.");
    }
  };

  const handleUpdateStatus = async (leadId: string, status: string) => {
    const activeGymId = gymId || "";
    const activeBranchId = branchId || "";
    try {
      await leadApi.updateStatus(activeGymId, activeBranchId, leadId, status);
      toast.success(`Lead status updated to ${status}`);
      fetchLeads();
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const handleConvertLead = async (leadId: string, name: string) => {
    try {
      await leadApi.convert(leadId);
      toast.success(`Lead ${name} converted to active member!`);
      fetchLeads();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to convert lead.");
    }
  };

  const handleAddNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteLeadId || !noteText.trim()) return;
    setSubmittingNote(true);
    try {
      await leadApi.addNote(noteLeadId, noteText);
      toast.success("Follow-up note saved!");
      setNoteLeadId(null);
      setNoteText("");
      fetchLeads();
    } catch {
      toast.error("Failed to save note.");
    } finally {
      setSubmittingNote(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={roleTitle ? `${roleTitle} Lead Management` : "Lead Management"}
        subtitle="Inquiries, Trial Members & Conversions"
        backTo={backTo}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLeads}
              className="inline-flex items-center gap-1 text-xs text-(--color-text-muted) hover:text-(--color-text) p-2 rounded-lg bg-(--color-surface-2)"
              title="Refresh Leads"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-(--color-accent)" : ""} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-(--color-accent) text-white text-sm font-medium px-4 py-2 hover:opacity-90 shadow-sm"
            >
              <Plus size={15} /> Add lead
            </button>
          </div>
        }
      />

      {resolvingBranch || loading ? (
        <Card className="flex items-center justify-center p-12 text-sm text-(--color-text-muted) gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-(--color-accent)" /> Loading sales leads pipeline from backend...
        </Card>
      ) : leads.length === 0 ? (
        <Card className="text-center py-12 text-(--color-text-muted) space-y-2">
          <Target className="w-8 h-8 mx-auto text-(--color-text-faint)" />
          <p className="text-sm font-medium text-(--color-text)">No sales leads in pipeline</p>
          <p className="text-xs text-(--color-text-muted)">Click "Add lead" to log new trial inquiries.</p>
        </Card>
      ) : (
        <Card className="p-4">
          <div className="space-y-3">
            {leads.map((lead) => {
              const leadId = lead._id || lead.id;
              const status = lead.status || "NEW";
              return (
                <div
                  key={leadId}
                  className="p-4 rounded-xl border border-(--color-border) bg-(--color-surface-2)/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-display text-base font-semibold text-(--color-text)">{lead.fullName}</h4>
                      <Badge tone={statusTone[status] || "neutral"}>{status}</Badge>
                    </div>
                    <p className="text-xs text-(--color-text-muted)">
                      📞 {lead.phone} {lead.email && `· ✉️ ${lead.email}`} · Source: <span className="font-medium text-(--color-text)">{lead.source || "Direct"}</span>
                    </p>
                    {lead.notes && lead.notes.length > 0 && (
                      <p className="text-[11px] text-(--color-text-faint) italic">
                        Latest Note: "{lead.notes[lead.notes.length - 1].note || lead.notes[lead.notes.length - 1]}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                    <button
                      onClick={() => setNoteLeadId(leadId)}
                      className="p-2 rounded-lg border border-(--color-border) text-xs font-medium text-(--color-text-muted) hover:text-(--color-text) flex items-center gap-1 cursor-pointer"
                      title="Add Note"
                    >
                      <MessageSquarePlus size={14} /> Note
                    </button>
                    {status !== "CONVERTED" && (
                      <button
                        onClick={() => handleConvertLead(leadId, lead.fullName)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/30 flex items-center gap-1 cursor-pointer"
                      >
                        <UserCheck size={14} /> Convert
                      </button>
                    )}
                    <CustomSelect
                      compact
                      value={status}
                      onChange={(newStatus) => handleUpdateStatus(leadId, newStatus)}
                      options={leadStatusOptions}
                    />
                    <button
                      onClick={() => handleEditLead(lead)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-amber-400 transition-colors cursor-pointer"
                      title="Edit Lead"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteLead(leadId, lead.fullName)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 transition-colors cursor-pointer"
                      title="Delete Lead"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)} maxWidth="md" title="Register Sales Lead">
          <form onSubmit={handleAddLead} className="space-y-4">
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-(--color-text-muted) mb-1 font-medium">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Singh"
                  value={newLead.fullName}
                  onChange={(e) => setNewLead({ ...newLead, fullName: e.target.value })}
                  className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border) focus:outline-none focus:border-(--color-accent)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-(--color-text-muted) mb-1 font-medium">Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border)"
                  />
                </div>
                <div>
                  <label className="block text-(--color-text-muted) mb-1 font-medium">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="vikram@gmail.com"
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-(--color-text-muted) mb-1 font-medium">Inquiry Source</label>
                <input
                  type="text"
                  placeholder="e.g. Instagram Ad, Walk-in, Referral"
                  value={newLead.source}
                  onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                  className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border)"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-(--color-surface-2) text-xs font-semibold text-(--color-text)"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAdd}
                className="flex-1 py-2.5 rounded-xl bg-(--color-accent) text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
              >
                {submittingAdd ? <Loader2 className="w-4 h-4 animate-spin" /> : "Register Lead"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Follow-up Note Modal */}
      {noteLeadId && (
        <Modal onClose={() => setNoteLeadId(null)} maxWidth="sm" title="Add Follow-up Note">
          <form onSubmit={handleAddNoteSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-(--color-text-muted) mb-1">
                Follow-up Details / Note
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Spoke on call, scheduled trial workout for tomorrow 5 PM."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border) focus:outline-none focus:border-(--color-accent)"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNoteLeadId(null)}
                className="flex-1 py-2 rounded-xl bg-(--color-surface-2) text-xs font-semibold text-(--color-text)"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingNote}
                className="flex-1 py-2 rounded-xl bg-(--color-accent) text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
              >
                {submittingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Note"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Lead Modal */}
      {showEditModal && (
        <Modal onClose={() => setShowEditModal(false)} maxWidth="md" title="Edit Sales Lead">
          <form onSubmit={handleUpdateLeadSubmit} className="space-y-4">
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-(--color-text-muted) mb-1 font-medium">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Singh"
                  value={editLead.fullName}
                  onChange={(e) => setEditLead({ ...editLead, fullName: e.target.value })}
                  className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border) focus:outline-none focus:border-(--color-accent)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-(--color-text-muted) mb-1 font-medium">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={editLead.phone}
                    onChange={(e) => setEditLead({ ...editLead, phone: e.target.value })}
                    className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border)"
                  />
                </div>

                <div>
                  <label className="block text-(--color-text-muted) mb-1 font-medium">Email Address</label>
                  <input
                    type="email"
                    value={editLead.email}
                    onChange={(e) => setEditLead({ ...editLead, email: e.target.value })}
                    className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-(--color-text-muted) mb-1 font-medium">Lead Source</label>
                  <input
                    type="text"
                    value={editLead.source}
                    onChange={(e) => setEditLead({ ...editLead, source: e.target.value })}
                    className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border)"
                  />
                </div>

                <div>
                  <label className="block text-(--color-text-muted) mb-1 font-medium">Pipeline Status</label>
                  <CustomSelect
                    value={editLead.status}
                    onChange={(val) => setEditLead({ ...editLead, status: val })}
                    options={leadStatusOptions}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-(--color-surface-2) text-xs font-semibold text-(--color-text)"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingEdit}
                className="flex-1 py-2.5 rounded-xl bg-(--color-accent) text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
              >
                {submittingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
