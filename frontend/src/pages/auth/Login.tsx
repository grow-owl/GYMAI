import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, ArrowRight, Loader2 } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      const loggedInUser = await login(email, password);
      const roleHome: Record<string, string> = {
        GYM_OWNER: "/owner",
        SUPER_ADMIN: "/owner",
        BRANCH_MANAGER: "/owner",
        TRAINER: "/trainer",
        MEMBER: "/member",
        KIOSK: "/reception",
      };
      navigate(roleHome[loggedInUser.role] ?? "/owner");
    } catch {
      // error already surfaced via context
    }
  };

  return (
    <AuthLayout
      eyebrow="Owner Login"
      title="Run your gym from one dashboard."
      subtitle="Sign in to see today's revenue, attendance, renewals and AI insights the moment you land."
    >
      <h1 className="font-display text-2xl font-semibold text-(--color-text) mb-1.5">Welcome back</h1>
      <p className="text-sm text-(--color-text-muted) mb-8">
        Enter your details to access your gym's dashboard.
      </p>

      {error && (
        <div className="mb-5 rounded-xl border border-(--color-danger)/30 bg-(--color-danger-soft) px-4 py-3 text-sm text-(--color-danger) animate-fade-in-up">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-(--color-text-muted) mb-1.5">Email address</label>
          <div className="relative">
            <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-text-faint)" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@yourgym.com"
              className="w-full rounded-xl border border-(--color-border) bg-(--color-surface) pl-10 pr-4 py-2.5 text-sm text-(--color-text) placeholder:text-(--color-text-faint) outline-none focus:border-(--color-accent)"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-(--color-text-muted)">Password</label>
            <Link to="/forgot-password" className="text-xs text-(--color-accent-text) hover:text-(--color-accent)">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-text-faint)" />
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-(--color-border) bg-(--color-surface) pl-10 pr-10 py-2.5 text-sm text-(--color-text) placeholder:text-(--color-text-faint) outline-none focus:border-(--color-accent)"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-(--color-text-faint) hover:text-(--color-text-muted)"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-(--color-text-muted) cursor-pointer select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded accent-(--color-accent)"
          />
          Remember me on this device
        </label>

        <button
          type="submit"
          disabled={loading}
          className="btn-press w-full flex items-center justify-center gap-2 rounded-xl bg-(--color-accent) hover:bg-(--color-accent-strong) text-white font-semibold text-sm py-3 transition-colors disabled:opacity-70"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Signing in…
            </>
          ) : (
            <>
              Sign in <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <p className="text-sm text-(--color-text-muted) text-center mt-7">
        New gym owner?{" "}
        <Link to="/register" className="text-(--color-accent-text) hover:text-(--color-accent) font-medium">
          Create your account
        </Link>
      </p>

      <p className="text-xs text-(--color-text-faint) text-center mt-4">
        Not an owner?{" "}
        <Link to="/roles" className="underline hover:text-(--color-text-muted)">
          Explore trainer, reception & member demos
        </Link>
      </p>
    </AuthLayout>
  );
}