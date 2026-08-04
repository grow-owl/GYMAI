import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { memberPayment } from "@/data/mock";

export default function Payments() {
  return (
    <div>
      <PageHeader title="Membership" backTo="/member" />
      <Card sweep className="border-(--color-accent)/25">
        <p className="text-xs text-(--color-text-faint) uppercase tracking-wide mb-1">Plan</p>
        <p className="font-display text-xl font-semibold text-(--color-text)">{memberPayment.plan}</p>
        <p className="text-sm text-(--color-text-muted) mt-1">Valid until {memberPayment.validUntil}</p>
        <p className="font-mono text-2xl font-semibold text-(--color-text) mt-4">{memberPayment.price}</p>
        <Badge tone="good" className="mt-3">{memberPayment.status}</Badge>
        <button className="mt-5 w-full rounded-full bg-(--color-accent) text-white text-sm font-semibold py-3">
          Renew Membership
        </button>
      </Card>
    </div>
  );
}
