import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { publicBranchApi } from "@/lib/endpoints";
import {
  Dumbbell,
  CheckCircle2,
  Phone,
  MapPin,
  Sparkles,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

interface GymBranchData {
  gym: {
    id: string;
    name: string;
    logoUrl?: string;
    defaultTrialPassDays: number;
  };
  branch: {
    id: string;
    name: string;
    address: {
      line1: string;
      city: string;
      state: string;
      pincode: string;
    };
    contactPhone: string;
  };
}

export default function JoinBranch() {
  const { branchId } = useParams<{ branchId: string }>();
  const [data, setData] = useState<GymBranchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    fitnessGoal: "Muscle Building & Strength",
    preferredTiming: "Morning (6 AM - 10 AM)",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!branchId) {
      setError("Invalid or missing gym branch link.");
      setLoading(false);
      return;
    }

    publicBranchApi
      .getBranchDetails(branchId)
      .then((res: any) => {
        setData(res);
      })
      .catch((err: any) => {
        setError(
          err.response?.data?.message ||
            "Unable to find this gym branch. Please verify the invitation link."
        );
      })
      .finally(() => setLoading(false));
  }, [branchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) return;

    if (!formData.fullName.trim() || !formData.phone.trim()) {
      toast.error("Please provide your name and mobile number.");
      return;
    }

    setSubmitting(true);
    try {
      await publicBranchApi.submitTrialLead({
        branchId,
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        fitnessGoal: formData.fitnessGoal,
        preferredTiming: formData.preferredTiming,
      });
      setSubmitted(true);
      toast.success("Free trial pass claimed successfully!");
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to request trial pass. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950 text-white">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto" />
          <p className="text-sm text-zinc-400">Loading gym invitation & pass details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950 text-white">
        <div className="max-w-md w-full p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
            <Dumbbell size={24} />
          </div>
          <h2 className="text-lg font-bold text-white">Gym Link Unavailable</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-all"
          >
            Visit Homepage
          </Link>
        </div>
      </div>
    );
  }

  const { gym, branch } = data;
  const trialDays = gym.defaultTrialPassDays || 2;
  const addressStr = [branch.address?.line1, branch.address?.city, branch.address?.pincode]
    .filter(Boolean)
    .join(", ");

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950 text-white">
        <div className="max-w-md w-full p-8 rounded-3xl bg-zinc-900/90 border border-amber-500/30 shadow-2xl backdrop-blur-xl text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 size={36} />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Pass Confirmed
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white">
              {trialDays}-Day Pass Ready!
            </h1>
            <p className="text-xs text-zinc-400">
              Welcome to <strong className="text-white">{gym.name}</strong> ({branch.name})
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 text-left space-y-2 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-white/5 gap-2">
              <span className="text-zinc-400 shrink-0">Pass Holder</span>
              <span className="font-semibold text-white text-right truncate">{formData.fullName}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-white/5 gap-2">
              <span className="text-zinc-400 shrink-0">Duration</span>
              <span className="font-semibold text-emerald-400 text-right">{trialDays} Days Free Access</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-white/5 gap-2">
              <span className="text-zinc-400 shrink-0">Location</span>
              <span className="font-semibold text-white truncate text-right max-w-[200px]">
                {branch.name}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 gap-2">
              <span className="text-zinc-400 shrink-0">Goal</span>
              <span className="font-semibold text-amber-400 truncate text-right max-w-[200px]">{formData.fitnessGoal}</span>
            </div>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Show your registered phone number (<strong className="text-white">{formData.phone}</strong>) at the reception counter when you visit to begin your workout!
          </p>

          {branch.contactPhone && (
            <a
              href={`tel:${branch.contactPhone}`}
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-amber-400 text-zinc-950 font-bold text-xs hover:bg-amber-300 transition-all shadow-lg shadow-amber-400/20"
            >
              <Phone size={14} /> Call Gym Front Desk ({branch.contactPhone})
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="max-w-md w-full space-y-6">
        {/* Gym Branding Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-zinc-950 shadow-xl shadow-amber-500/20 p-2.5">
            {gym.logoUrl ? (
              <img
                src={gym.logoUrl}
                alt={gym.name}
                className="w-full h-full object-contain rounded-xl"
              />
            ) : (
              <Dumbbell size={32} strokeWidth={2.5} />
            )}
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-[11px] font-bold uppercase tracking-wider mb-2">
              <Sparkles size={12} /> Exclusive Invitation Pass
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {gym.name}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 font-medium flex flex-wrap items-center justify-center gap-1.5 mt-1 text-center px-2">
              <MapPin size={13} className="text-amber-400 shrink-0 inline" />
              <span>{branch.name}</span>
              {addressStr && <span className="opacity-80">• {addressStr}</span>}
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="rounded-3xl bg-zinc-900/80 border border-white/10 p-5 sm:p-8 backdrop-blur-xl shadow-2xl space-y-5">
          <div className="border-b border-white/5 pb-4">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Zap size={18} className="text-amber-400 shrink-0" />
              <span>Claim Your {trialDays}-Day Free Workout Pass</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Zero admission fees. Free machine workout, cardio & trainer consultation.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Your Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                required
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3.5 py-3 sm:py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-base sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            {/* Mobile Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Mobile Number <span className="text-rose-400">*</span>
              </label>
              <input
                required
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-3 sm:py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-base sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            {/* Email (Optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Email Address <span className="text-zinc-500 font-normal">(Optional)</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@gmail.com"
                className="w-full px-3.5 py-3 sm:py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-base sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            {/* Fitness Goal */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Your Fitness Goal</label>
              <select
                value={formData.fitnessGoal}
                onChange={(e) => setFormData({ ...formData, fitnessGoal: e.target.value })}
                className="w-full px-3.5 py-3 sm:py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-base sm:text-sm text-white outline-none focus:border-amber-400 transition-colors"
              >
                <option value="Muscle Building & Strength">Muscle Building & Strength</option>
                <option value="Fat Loss & Weight Management">Fat Loss & Weight Management</option>
                <option value="General Fitness & Stamina">General Fitness & Stamina</option>
                <option value="CrossFit & Athletic Conditioning">CrossFit & Athletic Conditioning</option>
                <option value="Body Transformation & Toning">Body Transformation & Toning</option>
              </select>
            </div>

            {/* Preferred Workout Timing */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Preferred Timing</label>
              <select
                value={formData.preferredTiming}
                onChange={(e) => setFormData({ ...formData, preferredTiming: e.target.value })}
                className="w-full px-3.5 py-3 sm:py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-base sm:text-sm text-white outline-none focus:border-amber-400 transition-colors"
              >
                <option value="Early Morning (6 AM - 8 AM)">Early Morning (6 AM - 8 AM)</option>
                <option value="Morning (8 AM - 11 AM)">Morning (8 AM - 11 AM)</option>
                <option value="Afternoon (12 PM - 4 PM)">Afternoon (12 PM - 4 PM)</option>
                <option value="Evening (5 PM - 8 PM)">Evening (5 PM - 8 PM)</option>
                <option value="Night (8 PM - 10 PM)">Night (8 PM - 10 PM)</option>
                <option value="Flexible">Flexible / Any Time</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 font-black text-sm tracking-wide transition-all shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Reserving Pass...
                </>
              ) : (
                <>
                  Claim {trialDays}-Day Pass Now <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Guarantee / trust */}
          <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Instant confirmation • No credit card required</span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-zinc-600">
          Powered by GYMAI Platform & Management System
        </p>
      </div>
    </div>
  );
}
