import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  Camera,
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Check,
  KeyRound,
} from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { useAuth } from "@/store/authStore";

const inputCls =
  "w-full rounded-xl border border-(--color-border) bg-(--color-surface) pl-10 pr-4 py-2.5 text-sm text-(--color-text) placeholder:text-(--color-text-faint) outline-none focus:border-(--color-accent) hover:border-(--color-text-faint)";
const labelCls = "block text-xs font-medium text-(--color-text-muted) mb-1.5";

export default function Register() {
  const navigate = useNavigate();
  const { register, loading, error, fieldErrors, clearError } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitLockRef = useRef(false);

  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gymName, setGymName] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [pincode, setPincode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormError("Please upload an image file for your profile picture.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    clearError();
    setFormError(null);

    if (password.length < 8 || !/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
      setFormError("Password must be at least 8 characters and include a letter and a number.");
      submitLockRef.current = false;
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      submitLockRef.current = false;
      return;
    }
    if (!agree) {
      setFormError("Please accept the Terms & Privacy Policy to continue.");
      submitLockRef.current = false;
      return;
    }

    try {
      await register({
        fullName,
        email: email.trim(),
        phone: phone.trim(),
        password,
        gymName: gymName || undefined,
        address: { line1: line1.trim(), city: city.trim(), state: stateVal.trim(), pincode: pincode.trim() },
        avatarDataUrl: avatar,
        ownerInviteCode: inviteCode.trim(),
      });
      navigate("/owner");
    } catch {
      // surfaced via context `error`
    } finally {
      submitLockRef.current = false;
    }
  };

  return (
    <AuthLayout
      eyebrow="Owner Sign Up"
      title="Set up your gym in under two minutes."
      subtitle="Create your owner profile — add your photo, contact details and address so your team recognizes you instantly."
    >
      <h2 className="font-display text-xl font-semibold text-(--color-text)">Create your owner account</h2>
      <p className="text-sm text-(--color-text-muted) mt-1 mb-4">
        You'll be able to invite trainers & reception staff right after.
      </p>

      {(error || formError) && (
        <div className="mb-4 rounded-xl border border-(--color-danger)/30 bg-(--color-danger-soft) px-4 py-2.5 text-sm text-(--color-danger) animate-fade-in-up">
          {formError || error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className={labelCls}>Owner invite code</label>
          <div className="relative">
            <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-text-faint)" />
            <input
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Given to you by the gym owner"
              className={inputCls}
            />
          </div>
          <p className="text-xs text-(--color-text-faint) mt-1">
            Owner accounts can only be created with a valid invite code — ask whoever runs this GYMAI workspace for one.
          </p>
        </div>

        {/* Profile picture */}
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-press h-16 w-16 rounded-full overflow-hidden border-2 border-(--color-border) bg-(--color-surface-2) flex items-center justify-center animate-scale-in transition-transform hover:scale-[1.04] hover:border-(--color-accent)"
            >
              {avatar ? (
                <img src={avatar} alt="Profile preview" className="h-full w-full object-cover" />
              ) : (
                <User size={22} className="text-(--color-text-faint)" />
              )}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-press absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-(--color-accent) text-white shadow-md hover:bg-(--color-accent-strong)"
              aria-label="Upload profile picture"
            >
              <Camera size={12} strokeWidth={2.5} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div>
            <p className="text-sm font-medium text-(--color-text)">Profile photo</p>
            <p className="text-xs text-(--color-text-faint) mt-0.5">PNG or JPG, shown to your staff & members.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3.5">
          <div>
            <label className={labelCls}>Full name</label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-text-faint)" />
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Rohan Verma" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Gym name (optional)</label>
            <div className="relative">
              <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-text-faint)" />
              <input value={gymName} onChange={(e) => setGymName(e.target.value)} placeholder="PowerHouse Fitness" className={inputCls} />
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3.5">
          <div>
            <label className={labelCls}>Email address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-text-faint)" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@yourgym.com"
                className={clsx(inputCls, fieldErrors.email && "border-(--color-danger)")}
              />
            </div>
            {fieldErrors.email && <p className="text-xs text-(--color-danger) mt-1">{fieldErrors.email}</p>}
          </div>
          <div>
            <label className={labelCls}>Phone number</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-text-faint)" />
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className={clsx(inputCls, fieldErrors.phone && "border-(--color-danger)")}
              />
            </div>
            {fieldErrors.phone && <p className="text-xs text-(--color-danger) mt-1">{fieldErrors.phone}</p>}
          </div>
        </div>

        <div>
          <label className={labelCls}>Address</label>
          <div className="relative">
            <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-text-faint)" />
            <input required value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Street, area" className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <input required value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="rounded-xl border border-(--color-border) bg-(--color-surface) px-3.5 py-2.5 text-sm text-(--color-text) placeholder:text-(--color-text-faint) outline-none focus:border-(--color-accent) hover:border-(--color-text-faint)" />
          <input required value={stateVal} onChange={(e) => setStateVal(e.target.value)} placeholder="State" className="rounded-xl border border-(--color-border) bg-(--color-surface) px-3.5 py-2.5 text-sm text-(--color-text) placeholder:text-(--color-text-faint) outline-none focus:border-(--color-accent) hover:border-(--color-text-faint)" />
          <input required value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="Pincode" className="rounded-xl border border-(--color-border) bg-(--color-surface) px-3.5 py-2.5 text-sm text-(--color-text) placeholder:text-(--color-text-faint) outline-none focus:border-(--color-accent) hover:border-(--color-text-faint)" />
        </div>

        <div className="grid sm:grid-cols-2 gap-3.5">
          <div>
            <label className={labelCls}>Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-text-faint)" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-xl border border-(--color-border) bg-(--color-surface) pl-10 pr-10 py-2.5 text-sm text-(--color-text) placeholder:text-(--color-text-faint) outline-none focus:border-(--color-accent) hover:border-(--color-text-faint)"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-(--color-text-faint) hover:text-(--color-text-muted)"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelCls}>Confirm password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-text-faint)" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className={inputCls}
              />
            </div>
          </div>
        </div>

        <label className="flex items-start gap-2.5 text-sm text-(--color-text-muted) cursor-pointer select-none">
          <span className="relative flex h-5 w-5 shrink-0 items-center justify-center mt-0.5">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="peer h-5 w-5 rounded accent-(--color-accent) appearance-none border border-(--color-border) bg-(--color-surface) checked:bg-(--color-accent) checked:border-(--color-accent) hover:border-(--color-accent)"
            />
            <Check size={13} strokeWidth={3} className="pointer-events-none absolute text-white opacity-0 peer-checked:opacity-100" />
          </span>
          I agree to the <span className="text-(--color-accent-text)">Terms of Service</span> and{" "}
          <span className="text-(--color-accent-text)">Privacy Policy</span>.
        </label>

        <button
          type="submit"
          disabled={loading}
          className="btn-press w-full flex items-center justify-center gap-2 rounded-xl bg-(--color-accent) hover:bg-(--color-accent-strong) hover:shadow-lg hover:shadow-(--color-accent-soft) text-white font-semibold text-sm py-3 transition-all disabled:opacity-70"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Creating account…
            </>
          ) : (
            <>
              Create owner account <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <p className="text-sm text-(--color-text-muted) text-center mt-5">
        Already have an account?{" "}
        <Link to="/login" className="text-(--color-accent-text) hover:text-(--color-accent) font-medium">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
