import KpiCard from "@/components/ui/KpiCard";
import QuickAccessCard from "@/components/ui/QuickAccessCard";
import Card from "@/components/ui/Card";
import BarChart from "@/components/ui/BarChart";
import { attendanceToday, leadPipeline } from "@/data/mock";

const kpis = [
  { label: "Checked in today", value: String(attendanceToday.checkedIn), icon: "QrCode", tone: "blue" as const },
  { label: "Currently in gym", value: String(attendanceToday.currentlyIn), icon: "Users", tone: "green" as const },
  { label: "New leads today", value: "9", icon: "Target", tone: "pink" as const },
  { label: "Trial members", value: String(leadPipeline[2].count), icon: "ClipboardList", tone: "amber" as const },
];

const quickAccess = [
  { label: "Member Search", path: "/reception/search", icon: "Search" },
  { label: "Check-in", path: "/reception/check-in", icon: "QrCode", tone: "accent" as const },
  { label: "Leads", path: "/reception/leads", icon: "Target" },
  { label: "Trial Members", path: "/reception/leads", icon: "ClipboardList" },
  { label: "Payments", path: "/reception/payments", icon: "CreditCard" },
];

const pipelineColors = ["var(--tone-blue)", "var(--tone-purple)", "var(--tone-amber)", "var(--tone-green)"];

export default function ReceptionDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>
      <div>
        <p className="text-xs font-medium tracking-wide text-(--color-text-faint) uppercase mb-3">Quick access</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {quickAccess.map((item) => (
            <QuickAccessCard key={item.label + item.path} {...item} />
          ))}
        </div>
      </div>
      <Card>
        <p className="text-xs font-semibold tracking-wide text-(--color-text-faint) uppercase mb-4">Lead pipeline</p>
        <BarChart
          data={leadPipeline.map((p, i) => ({ label: p.stage, value: p.count, color: pipelineColors[i] }))}
        />
      </Card>
    </div>
  );
}
