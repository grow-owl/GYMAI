import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import KpiCard from "@/components/ui/KpiCard";
import QuickAccessCard from "@/components/ui/QuickAccessCard";
import Card from "@/components/ui/Card";
import BarChart from "@/components/ui/BarChart";
import { useAuthStore } from "@/store/authStore";
import { reportApi, attendanceApi, leadApi } from "@/lib/endpoints";

const quickAccess = [
  { label: "Add & Manage Members", path: "/reception/members", icon: "Users", tone: "accent" as const },
  { label: "Store & POS Sales", path: "/reception/inventory", icon: "Package" },
  { label: "Check-in Desk", path: "/reception/check-in", icon: "QrCode" },
  { label: "Record Payments", path: "/reception/payments", icon: "CreditCard" },
  { label: "Leads & Enquiries", path: "/reception/leads", icon: "Target" },
];

const pipelineColors = ["var(--tone-blue)", "var(--tone-purple)", "var(--tone-amber)", "var(--tone-green)"];
const stageOrder = ["NEW", "CONTACTED", "TRIAL", "CONVERTED"];

export default function ReceptionDashboard() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [todayCheckIns, setTodayCheckIns] = useState(0);
  const [currentlyIn, setCurrentlyIn] = useState(0);
  const [leadsList, setLeadsList] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.gymId) return;
    setLoading(true);
    Promise.all([
      reportApi.getOverview(user.gymId, user.branchId ?? undefined).catch(() => null),
      user.branchId ? attendanceApi.getToday(user.gymId, user.branchId).catch(() => null) : Promise.resolve(null),
      user.branchId ? leadApi.list(user.gymId, user.branchId).catch(() => []) : Promise.resolve([]),
    ])
      .then(([ovRes, attRes, leadRes]) => {
        const attList = Array.isArray(attRes) ? attRes : attRes?.attendance || [];
        setTodayCheckIns(ovRes?.todayCheckIns ?? attList.length);
        setCurrentlyIn(
          attList.filter(
            (a: any) =>
              a.status === "CHECKED_IN" || (!a.checkOutAt && !a.checkOutTime && a.status !== "CHECKED_OUT" && a.status !== "AUTO_CLOSED")
          ).length
        );
        setLeadsList(Array.isArray(leadRes) ? leadRes : []);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const pipelineData = stageOrder.map((stage, i) => ({
    label: stage.charAt(0) + stage.slice(1).toLowerCase(),
    value: leadsList.filter((l) => l.status === stage).length,
    color: pipelineColors[i % pipelineColors.length],
  }));

  const kpis = [
    { label: "Checked in today", value: String(todayCheckIns), icon: "QrCode", tone: "blue" as const },
    { label: "Currently in gym", value: String(currentlyIn), icon: "Users", tone: "green" as const },
    { label: "New leads today", value: String(leadsList.filter((l) => l.status === "NEW").length), icon: "Target", tone: "pink" as const },
    { label: "Trial members", value: String(leadsList.filter((l) => l.status === "TRIAL").length), icon: "ClipboardList", tone: "amber" as const },
  ];

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center p-8 text-sm text-(--color-text-muted) gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-(--color-accent)" /> Loading reception desk overview...
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {kpis.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>
      )}

      <div>
        <p className="text-xs font-medium tracking-wide text-(--color-text-faint) uppercase mb-3">Quick access</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(user?.role === "KIOSK"
            ? quickAccess.filter((item) => item.path !== "/reception/payments")
            : quickAccess
          ).map((item) => (
            <QuickAccessCard key={item.label + item.path} {...item} />
          ))}
        </div>
      </div>

      <Card>
        <p className="text-xs font-semibold tracking-wide text-(--color-text-faint) uppercase mb-4">Lead pipeline</p>
        <BarChart data={pipelineData} />
      </Card>
    </div>
  );
}
