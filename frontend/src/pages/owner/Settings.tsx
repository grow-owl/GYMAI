import { Building2, Users, Bell, ShieldCheck, CreditCard } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

const groups = [
  { icon: Building2, label: "Gym & Branches", desc: "Manage branch details, timezone, GPS radius" },
  { icon: Users, label: "Staff Roles", desc: "Owner, branch manager, trainer, reception access" },
  { icon: CreditCard, label: "Subscription Plan", desc: "PRO plan · 5 branches · renews 12 Aug 2027" },
  { icon: Bell, label: "Notifications", desc: "Push, WhatsApp reminders, broadcast messages" },
  { icon: ShieldCheck, label: "Data & Compliance", desc: "Export data, account deletion requests" },
];

export default function Settings() {
  return (
    <div>
      <PageHeader title="Settings" backTo="/owner" />
      <div className="space-y-3 max-w-2xl">
        {groups.map(({ icon: Icon, label, desc }) => (
          <Card key={label} className="flex items-center gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--color-surface-3) text-(--color-text)">
              <Icon size={17} />
            </span>
            <div>
              <p className="text-sm font-medium text-(--color-text)">{label}</p>
              <p className="text-xs text-(--color-text-faint) mt-0.5">{desc}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
