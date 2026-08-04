import { useState } from "react";
import { Star, MessageSquare, X } from "lucide-react";
import { feedbackApi } from "@/lib/endpoints";
import { toast } from "sonner";

interface Props {
  memberId: string;
  workoutLogId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function FeedbackModal({ memberId, workoutLogId, onClose, onSuccess }: Props) {
  const [rating, setRating] = useState(5);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      toast.error("Please enter a feedback comment.");
      return;
    }
    setSubmitting(true);
    try {
      await feedbackApi.submitFeedback(memberId, {
        rating,
        note: note.trim(),
        workoutLogId,
      });
      toast.success("Feedback submitted successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch {
      toast.error("Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-5 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-(--color-accent)" size={20} />
            <h3 className="text-base font-semibold text-(--color-text)">Session & Trainer Feedback</h3>
          </div>
          <button onClick={onClose} className="text-(--color-text-muted) hover:text-(--color-text)">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-(--color-text-muted) block mb-1.5">Rating (1 to 5 Stars)</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 text-amber-400 hover:scale-110 transition-transform"
                >
                  <Star size={24} fill={star <= rating ? "currentColor" : "none"} />
                </button>
              ))}
              <span className="text-xs font-semibold text-(--color-text) ml-2">{rating} / 5</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-(--color-text-muted) block mb-1">Feedback Note / Session Review</label>
            <textarea
              required
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="How was your workout session? Any feedback for your trainer..."
              className="w-full mt-1 p-2.5 rounded-xl bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-(--color-text-muted)"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium rounded-full bg-(--color-accent) text-white disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Feedback"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
