import { AlertTriangle, CalendarCheck } from "lucide-react";
import { Link } from "react-router-dom";
import QuickAccessCard from "@/components/ui/QuickAccessCard";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import DonutChart from "@/components/ui/DonutChart";
import { todaysSessions, clientRecoveryAlert } from "@/data/mock";

const quickAccess = [
  { label: "My Clients", path: "/trainer/clients", icon: "Users" },
  { label: "Today's Sessions", path: "/trainer/sessions", icon: "CalendarClock" },
  { label: "Workout Plans", path: "/trainer/workout-plans", icon: "Dumbbell" },
  { label: "Diet Plans", path: "/trainer/diet-plans", icon: "Salad" },
  { label: "Progress Tracking", path: "/trainer/progress", icon: "LineChart" },
  { label: "Recovery Alerts", path: "/trainer/recovery-alerts", icon: "HeartPulse", tone: "pink" as const },
];

const statusTone: Record<string, "good" | "danger" | "neutral"> = {
  done: "good",
  missed: "danger",
  upcoming: "neutral",
};

export default function TrainerDashboard() {
  const upcoming = todaysSessions.filter((s) => s.status === "upcoming");
  const done = todaysSessions.filter((s) => s.status === "done");
  const missed = todaysSessions.filter((s) => s.status === "missed");

  const sessionSegments = [
    { label: "Done", value: Math.max(done.length, 0.0001), color: "var(--tone-green)" },
    { label: "Upcoming", value: Math.max(upcoming.length, 0.0001), color: "var(--tone-blue)" },
    { label: "Missed", value: Math.max(missed.length, 0.0001), color: "var(--tone-pink)" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <Card sweep className="flex flex-col justify-center">
          <p className="text-sm text-(--color-text-muted)">You have</p>
          <p className="font-display text-2xl font-semibold text-(--color-text)">{todaysSessions.length} sessions today</p>
          <p className="text-xs text-(--color-text-faint) mt-1">{upcoming.length} still upcoming</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <CalendarCheck size={15} className="text-(--tone-blue-text)" />
            <p className="text-xs font-semibold tracking-wide text-(--color-text-faint) uppercase">Session status</p>
          </div>
          <DonutChart segments={sessionSegments} size={104} thickness={13} />
        </Card>
      </div>

      <div>
        <p className="text-xs font-medium tracking-wide text-(--color-text-faint) uppercase mb-3">Today</p>
        <Card className="p-0 overflow-hidden">
          <div className="divide-y divide-(--color-border-soft)">
            {todaysSessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 sm:px-5 py-3.5 hover:bg-(--color-surface-2) transition-colors">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-(--color-text-faint) w-16 shrink-0">{s.time}</span>
                  <div>
                    <p className="text-sm font-medium text-(--color-text)">{s.clientName}</p>
                    <p className="text-xs text-(--color-text-faint)">{s.type}</p>
                  </div>
                </div>
                <Badge tone={statusTone[s.status] ?? "neutral"}>{s.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <p className="text-xs text-(--color-text-faint) mt-2">{upcoming.length} sessions remaining today</p>
      </div>

      <div>
        <p className="text-xs font-medium tracking-wide text-(--color-text-faint) uppercase mb-3">Quick access</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {quickAccess.map((item) => (
            <QuickAccessCard key={item.path} {...item} />
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium tracking-wide text-(--color-text-faint) uppercase mb-3">Client attention required</p>
        <Card className="border-(--color-danger)/30 bg-(--color-danger-soft)">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={15} className="text-(--color-danger)" />
            <p className="text-xs font-semibold text-(--color-danger) uppercase tracking-wide">Recovery alert</p>
          </div>
          <p className="text-sm font-medium text-(--color-text)">{clientRecoveryAlert.name}</p>
          <p className="text-xs text-(--color-text-faint) mb-1">Recovery Score: {clientRecoveryAlert.score}/100</p>
          <p className="text-sm text-(--color-text-muted) mb-3">{clientRecoveryAlert.note}</p>
          <Link
            to="/trainer/recovery-alerts"
            className="inline-flex items-center rounded-full bg-(--color-surface-3) text-(--color-text) text-xs font-medium px-3.5 py-1.5 hover:bg-(--color-surface) transition-colors"
          >
            View member
          </Link>
        </Card>
      </div>
    </div>
  );
}
