import { QrCode, ShieldCheck, Users } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

export default function CheckIn() {
  return (
    <div>
      <PageHeader title="Member Attendance" subtitle="QR scanning is handled on the member screen" backTo="/reception" />

      <Card sweep className="border-(--color-accent)/25 max-w-xl mx-auto">
        <div className="flex flex-col items-center text-center py-12">
          <div className="h-40 w-40 rounded-2xl border-2 border-dashed border-(--color-accent)/50 flex items-center justify-center mb-5 bg-(--color-surface-2)">
            <QrCode size={40} className="text-(--color-accent)" />
          </div>
          <p className="font-display text-lg font-semibold text-(--color-text)">Attendance is member-only</p>
          <p className="mt-2 text-sm text-(--color-text-muted) max-w-md">
            Members scan their own gym QR from the member attendance page. Reception can review attendance summaries,
            but this page does not start scanning.
          </p>

          <div className="mt-6 grid gap-3 w-full sm:grid-cols-3">
            {[
              { label: "Member scan", icon: Users },
              { label: "No receptionist scanning", icon: ShieldCheck },
              { label: "No owner scan", icon: QrCode },
            ].map(({ label, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4">
                <Icon size={16} className="mx-auto text-(--color-accent)" />
                <p className="mt-3 text-sm font-medium text-(--color-text)">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}