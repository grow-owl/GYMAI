import { Link } from "react-router-dom";
import { ArrowRight, KeyRound } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";

export default function Register() {
  return (
    <AuthLayout
      eyebrow="Account Registration"
      title="Gym Owner Account Setup"
      subtitle="Gym Owner accounts are managed centrally by Super Administration."
    >
      <div className="space-y-4 text-center py-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-(--color-accent-soft) flex items-center justify-center text-(--color-accent)">
          <KeyRound size={24} />
        </div>
        <h2 className="font-display text-xl font-semibold text-(--color-text)">Gym Owner Accounts</h2>
        <p className="text-sm text-(--color-text-muted) leading-relaxed">
          Public self-registration for Gym Owner accounts is disabled. Gym Owner accounts and Gym workspaces are provisioned exclusively by <strong>Super Administration</strong>.
        </p>
        <p className="text-xs text-(--color-text-faint)">
          Members, Trainers, and Staff will receive their login credentials directly from their Gym Owner upon account creation.
        </p>
        <div className="pt-4">
          <Link
            to="/login"
            className="btn-press inline-flex items-center justify-center gap-2 rounded-xl bg-(--color-accent) text-(--color-navbar) font-bold text-sm px-6 py-3 hover:bg-(--color-accent-strong)"
          >
            Go to Login <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
