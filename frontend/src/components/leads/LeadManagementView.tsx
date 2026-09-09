import { useState, useEffect } from "react";
import { Plus, Target, Loader2, RefreshCw, UserCheck, MessageSquarePlus, Pencil, Trash2, Share2, QrCode, Copy, Check, ExternalLink, Phone } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import CustomSelect from "@/components/ui/CustomSelect";
import Modal from "@/components/ui/Modal";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { leadApi, gymApi } from "@/lib/endpoints";
import { useGymBranch } from "@/hooks/useGymBranch";
import { toast } from "sonner";
import { showApiErrorToast } from "@/lib/api";

const statusTone: Record<string, "accent" | "warn" | "good" | "danger" | "neutral"> = {
  NEW: "accent",
  CONTACTED: "warn",
  TRIAL_SCHEDULED: "warn",
  TRIAL_COMPLETED: "good",
  CONVERTED: "good",
  LOST: "danger",
};

const leadStatusOptions: { value: string; label: string; shortLabel?: string; dotColor?: string }[] = [
  { value: "NEW", label: "NEW", shortLabel: "NEW", dotColor: "bg-cyan-500" },
  { value: "CONTACTED", label: "CONTACTED", shortLabel: "CONTACTED", dotColor: "bg-amber-500" },
  { value: "TRIAL_SCHEDULED", label: "TRIAL SCHEDULED", shortLabel: "TRIAL SCHED", dotColor: "bg-orange-500" },
  { value: "TRIAL_COMPLETED", label: "TRIAL COMPLETED", shortLabel: "TRIAL DONE", dotColor: "bg-emerald-500" },
  { value: "CONVERTED", label: "CONVERTED", shortLabel: "CONVERTED", dotColor: "bg-purple-500" },
  { value: "LOST", label: "LOST", shortLabel: "LOST", dotColor: "bg-rose-500" },
];

interface LeadManagementViewProps {
  backTo?: string;
  roleTitle?: string;
}

export default function LeadManagementView({ backTo = "/owner", roleTitle }: LeadManagementViewProps) {
  const { gymId, branchId, loading: resolvingBranch } = useGymBranch();
  const [leads, setLeads] = useState<any[]>([]);
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
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

  const activeNoteLead = leads.find((l) => (l._id || l.id) === noteLeadId);
  const activeNoteLeadNotes = activeNoteLead?.followUpNotes || activeNoteLead?.notes || [];

  // Shareable Link & QR Modal State
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (gymId) {
      gymApi
        .listBranches(gymId)
        .then((res) => {
          const list = Array.isArray(res) ? res : (res as any)?.branches || [];
          setBranchesList(list);
        })
        .catch(() => {});
    }
  }, [gymId]);

  const effectiveBranchId = selectedBranchId || branchId || (branchesList.length > 0 ? branchesList[0]._id || branchesList[0].id : "");
  const publicJoinUrl = effectiveBranchId ? `${window.location.origin}/join/${effectiveBranchId}` : "";

  const handleCopyPublicLink = () => {
    if (!publicJoinUrl) return;
    navigator.clipboard.writeText(publicJoinUrl);
    setCopiedLink(true);
    toast.success("Branded Member Trial Pass link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const [newLead, setNewLead] = useState({
    fullName: "",
    phone: "",
    email: "",
    source: "Website Inquiry",
  });

  const fetchLeads = async () => {
    if (!gymId) {
      setLeads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const activeBranch = selectedBranchId || branchId || undefined;
      const res = await leadApi.list(gymId, activeBranch);
      const list = Array.isArray(res) ? res : (res as any)?.leads || [];
      setLeads(list);
    } catch (err: any) {
      showApiErrorToast(err, "Failed to load leads");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [gymId, branchId, selectedBranchId]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeGymId = gymId || "";
    const activeBranchId = selectedBranchId || branchId || undefined;
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
              className="inline-flex items-center gap-1 text-xs text-(--color-text-muted) hover:text-(--color-text) p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border)"
              title="Refresh Leads"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-(--color-accent)" : ""} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="hidden lg:inline-flex items-center gap-1.5 rounded-full bg-(--color-accent) text-(--color-navbar) text-sm font-bold px-4 py-2 hover:opacity-90 shadow-sm cursor-pointer"
            >
              <Plus size={15} /> Add lead
            </button>
          </div>
        }
      />

      {/* Mobile & Tablet Full-width Action Button */}
      <div className="block lg:hidden w-full">
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-xl bg-(--color-accent) text-(--color-navbar) text-sm font-bold px-4 hover:opacity-90 active:scale-[0.99] shadow-sm transition-all cursor-pointer"
        >
          <Plus size={17} /> Add Lead
        </button>
      </div>

      {/* Branch selector if owner has multiple branches */}
      {branchesList.length > 1 && !branchId && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedBranchId("")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              !selectedBranchId
                ? "bg-(--color-accent) text-(--color-navbar)"
                : "bg-(--color-surface-2) text-(--color-text-muted) hover:text-(--color-text)"
            }`}
          >
            All Branches
          </button>
          {branchesList.map((b) => (
            <button
              key={b._id || b.id}
              onClick={() => setSelectedBranchId(b._id || b.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedBranchId === (b._id || b.id)
                  ? "bg-(--color-accent) text-(--color-navbar)"
                  : "bg-(--color-surface-2) text-(--color-text-muted) hover:text-(--color-text)"
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}

      {/* Public Trial Pass Shareable Banner (Clean Solid UI theme, no transparent greens) */}
      {effectiveBranchId && (
        <Card className="p-4 border border-(--color-border) bg-(--color-surface-2)/40">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-(--color-surface-2) text-(--color-accent) border border-(--color-border)">
                  <Share2 size={16} />
                </div>
                <h3 className="text-sm font-bold text-(--color-text)">
                  Shareable Member Free Trial Pass Link
                </h3>
              </div>
              <p className="text-xs text-(--color-text-muted)">
                Share this link on Instagram, WhatsApp, or print the QR code for your reception counter. Prospective members can claim their free pass directly!
              </p>
              <div className="pt-0.5">
                <span className="text-xs font-mono text-(--color-text) bg-(--color-surface) px-3 py-1.5 rounded-lg border border-(--color-border) inline-block break-all select-all font-semibold">
                  {publicJoinUrl}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 w-full sm:w-auto">
              <button
                onClick={handleCopyPublicLink}
                className="flex-1 sm:flex-initial h-9 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl bg-(--color-surface-2) border border-(--color-border) text-xs font-semibold text-(--color-text) hover:bg-(--color-surface-3) transition-colors cursor-pointer whitespace-nowrap"
              >
                {copiedLink ? <Check size={14} className="text-(--color-good) shrink-0" /> : <Copy size={14} className="shrink-0" />}
                <span className="whitespace-nowrap">{copiedLink ? "Copied!" : "Copy Link"}</span>
              </button>

              <button
                onClick={() => setShowQrModal(true)}
                className="flex-1 sm:flex-initial h-9 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl bg-(--color-surface-2) border border-(--color-border) text-xs font-semibold text-(--color-text) hover:bg-(--color-surface-3) hover:border-(--color-accent) transition-colors cursor-pointer whitespace-nowrap"
              >
                <QrCode size={14} className="text-(--color-accent) shrink-0" />
                <span className="whitespace-nowrap">Show QR Code</span>
              </button>

              <a
                href={publicJoinUrl}
                target="_blank"
                rel="noreferrer"
                className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-xl bg-(--color-surface-2) border border-(--color-border) text-(--color-text-muted) hover:text-(--color-text) transition-colors"
                title="Preview Page"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </Card>
      )}

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
              const leadNotes = lead.followUpNotes || lead.notes || [];
              const latestNote = leadNotes.length > 0 ? leadNotes[leadNotes.length - 1] : null;
              const latestNoteText = latestNote ? (typeof latestNote === "string" ? latestNote : latestNote.note) : "";
              const latestNoteDate = latestNote?.addedAt
                ? new Date(latestNote.addedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null;

              return (
                <div
                  key={leadId}
                  className="p-3.5 sm:p-4 rounded-xl border border-(--color-border) bg-(--color-surface-2)/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0 w-full sm:w-auto">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-display text-sm sm:text-base font-semibold text-(--color-text)">{lead.fullName}</h4>
                      <Badge tone={statusTone[status] || "neutral"}>{status}</Badge>
                    </div>

                    {/* Phone & Email on one line */}
                    <div className="flex items-center gap-2 text-xs text-(--color-text-muted) flex-wrap">
                      <span className="font-mono text-(--color-text) font-medium">
                        📞 {lead.phone}
                      </span>
                      {lead.email && (
                        <>
                          <span>·</span>
                          <span className="text-(--color-text-muted)">✉️ {lead.email}</span>
                        </>
                      )}
                    </div>

                    {/* Requirement & Desktop Follow-up Note (side-by-side / inline on desktop) */}
                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                      {lead.source && (
                        <div className="inline-flex items-start sm:items-center gap-1.5 text-xs bg-(--color-surface-2) px-2.5 py-1 rounded-lg border border-(--color-border)">
                          <span className="font-semibold text-(--color-text-muted) shrink-0">Requirement / Note:</span>
                          <span className="font-medium text-(--color-text)">{lead.source}</span>
                        </div>
                      )}

                      {/* Desktop Follow-up Note (Sleek inline quote badge) */}
                      {leadNotes.length > 0 && (
                        <div
                          onClick={() => setNoteLeadId(leadId)}
                          className="hidden sm:inline-flex items-center gap-2 text-xs bg-(--color-surface) hover:bg-(--color-surface-3) px-2.5 py-1 rounded-lg border border-(--color-border) border-l-2 border-l-(--color-accent) max-w-xl cursor-pointer transition-colors group shadow-2xs"
                          title="Click to view full notes history or add new note"
                        >
                          <span className="font-semibold text-(--color-accent) flex items-center gap-1 shrink-0 text-[11px]">
                            <MessageSquarePlus size={12} className="group-hover:scale-110 transition-transform" />
                            Follow-up ({leadNotes.length}):
                          </span>
                          <span className="font-medium text-(--color-text) truncate max-w-sm lg:max-w-md">
                            "{latestNoteText}"
                          </span>
                          {latestNoteDate && (
                            <span className="text-[10px] text-(--color-text-muted) font-mono shrink-0">
                              · {latestNoteDate}
                            </span>
                          )}
                          {leadNotes.length > 1 && (
                            <span className="text-[11px] text-(--color-accent) font-semibold shrink-0 ml-0.5">
                              +{leadNotes.length - 1} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Mobile Follow-up notes section (sm:hidden - untouched for mobile & tablet) */}
                    {leadNotes.length > 0 && (
                      <div className="sm:hidden pt-1">
                        <div className="p-2.5 rounded-xl bg-(--color-surface) border border-(--color-border) space-y-1">
                          <div className="flex items-center justify-between text-[11px] gap-2">
                            <span className="font-semibold text-(--color-accent) flex items-center gap-1.5">
                              <MessageSquarePlus size={13} />
                              Follow-up Note ({leadNotes.length})
                            </span>
                            {latestNoteDate && (
                              <span className="text-[10px] text-(--color-text-muted) font-mono shrink-0">
                                {latestNoteDate}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-(--color-text) font-medium break-words leading-relaxed">
                            "{latestNoteText}"
                          </p>
                          {leadNotes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setNoteLeadId(leadId)}
                              className="text-[11px] text-(--color-accent) hover:underline font-semibold cursor-pointer pt-0.5 inline-block"
                            >
                              + View all {leadNotes.length} notes / Add new
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Desktop Actions (>= 640px) */}
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setNoteLeadId(leadId)}
                      className="h-8 px-2.5 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-xs font-medium text-(--color-text-muted) hover:text-(--color-text) flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                      title="Add / View Notes"
                    >
                      <MessageSquarePlus size={14} /> Note {leadNotes.length > 0 && `(${leadNotes.length})`}
                    </button>
                    {status !== "CONVERTED" && (
                      <button
                        onClick={() => handleConvertLead(leadId, lead.fullName)}
                        className="h-8 px-2.5 rounded-lg bg-(--color-surface-2) text-(--color-text) border border-(--color-border) text-xs font-semibold hover:border-(--color-accent) hover:text-(--color-accent) flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                      >
                        <UserCheck size={14} className="text-(--color-accent)" /> Convert
                      </button>
                    )}
                    <CustomSelect
                      asButton
                      align="right"
                      value={status}
                      onChange={(newStatus) => handleUpdateStatus(leadId, newStatus)}
                      options={leadStatusOptions}
                    />
                    <button
                      onClick={() => handleEditLead(lead)}
                      className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-(--color-surface-2) border border-(--color-border) text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer shrink-0"
                      title="Edit Lead"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteLead(leadId, lead.fullName)}
                      className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-(--color-surface-2) border border-(--color-border) text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                      title="Delete Lead"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Mobile Actions (< 640px) */}
                  <div className="sm:hidden w-full pt-2 border-t border-(--color-border-soft) flex flex-col gap-2">
                    {/* Row 1: Pipeline Status & Convert */}
                    <div className="flex items-center gap-2 w-full">
                      <div className="flex-1 min-w-0">
                        <CustomSelect
                          asButton
                          align="left"
                          value={status}
                          onChange={(newStatus) => handleUpdateStatus(leadId, newStatus)}
                          options={leadStatusOptions}
                        />
                      </div>
                      {status !== "CONVERTED" && (
                        <button
                          onClick={() => handleConvertLead(leadId, lead.fullName)}
                          className="h-8 px-3 rounded-lg bg-(--color-surface-2) text-(--color-text) border border-(--color-border) text-xs font-semibold hover:border-(--color-accent) hover:text-(--color-accent) flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <UserCheck size={14} className="text-(--color-accent)" /> Convert
                        </button>
                      )}
                    </div>

                    {/* Row 2: Note + Call + Edit + Delete */}
                    <div className="flex items-center gap-1.5 w-full">
                      <button
                        onClick={() => setNoteLeadId(leadId)}
                        className="flex-1 h-8 px-2.5 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-xs font-medium text-(--color-text-muted) hover:text-(--color-text) flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                      >
                        <MessageSquarePlus size={14} /> Note {leadNotes.length > 0 && `(${leadNotes.length})`}
                      </button>
                      <a
                        href={`tel:${lead.phone}`}
                        className="h-8 px-2.5 inline-flex items-center justify-center gap-1 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-xs font-medium text-(--color-good) hover:bg-emerald-500/10 transition-colors cursor-pointer shrink-0"
                        title="Call Lead"
                      >
                        <Phone size={13} />
                        <span>Call</span>
                      </a>
                      <button
                        onClick={() => handleEditLead(lead)}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-(--color-surface-2) border border-(--color-border) text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer shrink-0"
                        title="Edit Lead"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteLead(leadId, lead.fullName)}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-(--color-surface-2) border border-(--color-border) text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                        title="Delete Lead"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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
                <label className="block text-(--color-text-muted) mb-1 font-medium">Requirement / Note (or Source)</label>
                <input
                  type="text"
                  placeholder="e.g. Interested in 3 months membership, morning batch, weight loss"
                  value={newLead.source}
                  onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                  className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border) focus:outline-none focus:border-(--color-accent)"
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
                className="flex-1 py-2.5 rounded-xl bg-(--color-accent) text-(--color-navbar) text-xs font-bold shadow-md flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90"
              >
                {submittingAdd ? <Loader2 className="w-4 h-4 animate-spin" /> : "Register Lead"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add / View Follow-up Notes Modal */}
      {noteLeadId && (
        <Modal
          onClose={() => {
            setNoteLeadId(null);
            setNoteText("");
          }}
          maxWidth="sm"
          title={`Follow-up Notes: ${activeNoteLead?.fullName || "Lead"}`}
        >
          <div className="space-y-4">
            {activeNoteLeadNotes.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-(--color-text-muted)">
                  Previous Notes ({activeNoteLeadNotes.length})
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {activeNoteLeadNotes.map((n: any, idx: number) => {
                    const text = typeof n === "string" ? n : n.note;
                    const dateStr = n.addedAt
                      ? new Date(n.addedAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : null;
                    return (
                      <div key={idx} className="p-2.5 rounded-xl bg-(--color-surface-2) border border-(--color-border) text-xs space-y-1">
                        <p className="text-(--color-text) font-medium break-words leading-relaxed">{text}</p>
                        {dateStr && <p className="text-[10px] text-(--color-text-muted) font-mono">{dateStr}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <form onSubmit={handleAddNoteSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-(--color-text-muted) mb-1">
                  {activeNoteLeadNotes.length > 0 ? "Add Another Follow-up Note" : "Follow-up Details / Note"}
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
                  onClick={() => {
                    setNoteLeadId(null);
                    setNoteText("");
                  }}
                  className="flex-1 py-2 rounded-xl bg-(--color-surface-2) text-xs font-semibold text-(--color-text) cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingNote}
                  className="flex-1 py-2 rounded-xl bg-(--color-accent) text-(--color-navbar) text-xs font-bold shadow-md flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90"
                >
                  {submittingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Note"}
                </button>
              </div>
            </form>
          </div>
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
                  <label className="block text-(--color-text-muted) mb-1 font-medium">Requirement / Note (or Source)</label>
                  <input
                    type="text"
                    placeholder="e.g. Interested in 3 months membership, morning batch"
                    value={editLead.source}
                    onChange={(e) => setEditLead({ ...editLead, source: e.target.value })}
                    className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border) focus:outline-none focus:border-(--color-accent)"
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
                className="flex-1 py-2.5 rounded-xl bg-(--color-accent) text-(--color-navbar) text-xs font-bold shadow-md flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90"
              >
                {submittingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* QR Code Modal for Counter Printing / Scanning */}
      {showQrModal && (
        <Modal
          onClose={() => setShowQrModal(false)}
          title="Branch QR Code for Member Free Trial Pass"
          subtitle="Print this QR code or display it on your gym reception counter for prospective walk-ins to scan and claim their pass."
        >
          <div className="text-center py-4 space-y-4">
            <div className="p-4 bg-white rounded-2xl inline-block shadow-lg mx-auto max-w-[240px] w-full">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(publicJoinUrl)}`}
                alt="Gym Pass QR Code"
                className="w-full h-auto aspect-square mx-auto object-contain"
              />
            </div>
            <p className="text-xs text-(--color-text-muted) max-w-sm mx-auto break-all">
              Scan with any mobile camera to open your gym's branded pass claim page (<span className="font-mono text-(--color-accent) font-semibold">{publicJoinUrl}</span>).
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-2 pt-2">
              <button
                onClick={handleCopyPublicLink}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-bold rounded-xl bg-(--color-accent) text-(--color-navbar) shadow-sm hover:opacity-90 cursor-pointer"
              >
                {copiedLink ? "Link Copied!" : "Copy Pass Link"}
              </button>
              <button
                onClick={() => setShowQrModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-medium rounded-xl bg-(--color-surface-2) text-(--color-text-muted)"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
