import { useState, useEffect } from "react";
import { Phone, Mail, Loader2, RefreshCw } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { memberApi, authApi } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

import FeedbackModal from "@/components/FeedbackModal";

export default function MemberProfile() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "" });

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await memberApi.getSelfProfile();
      if (res?.member) {
        setProfileData(res.member);
        setForm({
          fullName: res.member.userId?.fullName || user?.fullName || "",
          phone: res.member.userId?.phone || user?.phone || "",
        });
      }
    } catch {
      setError("Failed to load your member profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authApi.updateProfile(form);
      toast.success("Profile updated successfully!");
      setEditing(false);
      fetchProfile();
    } catch {
      toast.error("Failed to update profile.");
    }
  };

  const memberName = profileData?.userId?.fullName || user?.fullName || "Member";
  const planName = profileData?.planName || "Annual Membership";
  const startDate = profileData?.membershipStartDate ? new Date(profileData.membershipStartDate).toLocaleDateString() : "—";
  const endDate = profileData?.membershipEndDate ? new Date(profileData.membershipEndDate).toLocaleDateString() : "—";
  const status = profileData?.membershipStatus || "ACTIVE";

  return (
    <div className="space-y-4 max-w-2xl mx-auto w-full">
      <PageHeader title="My Profile" subtitle="Membership details & account info" backTo="/member" />

      {loading ? (
        <Card className="flex items-center justify-center p-12 text-sm text-(--color-text-muted) gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-(--color-accent)" /> Loading profile...
        </Card>
      ) : error ? (
        <Card className="text-center py-8">
          <p className="text-sm text-(--color-danger) mb-3">{error}</p>
          <button
            onClick={fetchProfile}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-full bg-(--color-surface-3) text-(--color-text)"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card sweep className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-(--color-surface-3) font-display text-xl font-bold text-(--color-text)">
                {memberName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <p className="font-display text-lg font-semibold text-(--color-text)">{memberName}</p>
                <p className="text-xs text-(--color-text-faint)">{planName}</p>
              </div>
            </div>
            <Badge tone={status === "FROZEN" ? "accent" : "good"}>{status}</Badge>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between border-b border-(--color-border-soft) pb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-faint)">Contact Information</p>
              <button
                onClick={() => setEditing(!editing)}
                className="text-xs text-(--color-accent-text) font-medium hover:underline"
              >
                {editing ? "Cancel" : "Edit"}
              </button>
            </div>

            {editing ? (
              <form onSubmit={handleSaveProfile} className="space-y-3 pt-1">
                <div>
                  <label className="text-xs text-(--color-text-muted)">Full Name</label>
                  <input
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-(--color-text-muted)">Phone Number</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-full bg-(--color-accent) text-white"
                >
                  Save Changes
                </button>
              </form>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-(--color-text-muted)">
                  <Mail size={15} /> <span>{profileData?.userId?.email || user?.email}</span>
                </div>
                <div className="flex items-center gap-2 text-(--color-text-muted)">
                  <Phone size={15} /> <span>{profileData?.userId?.phone || user?.phone || "—"}</span>
                </div>
              </div>
            )}
          </Card>

          <Card className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-faint)">Membership Summary</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-(--color-surface-2) p-3">
                <p className="text-xs text-(--color-text-faint)">Member Since</p>
                <p className="font-semibold text-(--color-text) mt-0.5">{startDate}</p>
              </div>
              <div className="rounded-xl bg-(--color-surface-2) p-3">
                <p className="text-xs text-(--color-text-faint)">Valid Until</p>
                <p className="font-semibold text-(--color-text) mt-0.5">{endDate}</p>
              </div>
            </div>
          </Card>

          {/* Trainer Feedback Section */}
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-(--color-text)">Trainer & Session Feedback</p>
              <p className="text-xs text-(--color-text-faint) mt-0.5">Rate your assigned trainer & leave workout notes</p>
            </div>
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="px-3.5 py-2 text-xs font-medium rounded-full bg-(--color-accent) text-white hover:opacity-90"
            >
              Give Feedback
            </button>
          </Card>

          {showFeedbackModal && profileData?._id && (
            <FeedbackModal
              memberId={profileData._id}
              onClose={() => setShowFeedbackModal(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
