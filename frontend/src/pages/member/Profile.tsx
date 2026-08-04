import { ChevronRight, Dumbbell, Bell, ShieldCheck, LogOut, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { gym } from "@/data/mock";

const links = [
  { label: "Trainer — Rahul Mehta", icon: Dumbbell, path: "/member" },
  { label: "Membership & Payments", icon: CreditCard, path: "/member/payments" },
  { label: "Notifications", icon: Bell, path: "/member" },
  { label: "Privacy & Data", icon: ShieldCheck, path: "/member" },
];

export default function Profile() {
  return (
    <div>
      <PageHeader title="Profile" backTo="/member" />

      <Card sweep className="flex items-center gap-4 mb-5 border-(--color-accent)/20">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-(--color-accent) text-lg font-semibold text-white">
          {gym.memberName[0]}
        </span>
        <div>
          <p className="font-display font-semibold text-(--color-text)">{gym.memberName} Sen</p>
          <p className="text-xs text-(--color-text-faint)">{gym.name} · {gym.branch}</p>
        </div>
      </Card>

      <div className="space-y-2">
        {links.map(({ label, icon: Icon, path }) => (
          <Link key={label} to={path} className="flex items-center justify-between rounded-2xl border border-(--color-border) bg-(--color-surface) px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Icon size={16} className="text-(--color-text-muted)" />
              <span className="text-sm text-(--color-text)">{label}</span>
            </div>
            <ChevronRight size={15} className="text-(--color-text-faint)" />
          </Link>
        ))}
        <Link to="/" className="flex items-center gap-3 rounded-2xl border border-(--color-danger)/25 bg-(--color-danger-soft) px-4 py-3.5 text-sm text-(--color-danger)">
          <LogOut size={16} /> Switch role
        </Link>
      </div>
    </div>
  );
}
