import { useState } from "react";
import { FileDown, Eye, X, FileJson, FileSpreadsheet } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { members, trainers, leads, attendanceToday, ownerRevenue } from "@/data/mock";

interface ReportRow {
  [key: string]: string | number;
}

interface ReportDef {
  key: string;
  name: string;
  desc: string;
  period: string;
  columns: string[];
  rows: () => ReportRow[];
}

const reports: ReportDef[] = [
  {
    key: "attendance",
    name: "Attendance Report",
    desc: "Daily check-ins across branches",
    period: "This month",
    columns: ["Metric", "Value"],
    rows: () => [
      { Metric: "Checked in today", Value: attendanceToday.checkedIn },
      { Metric: "Currently in gym", Value: attendanceToday.currentlyIn },
      { Metric: "Checked out", Value: attendanceToday.checkedOut },
      { Metric: "Peak time", Value: attendanceToday.peakTime },
    ],
  },
  {
    key: "revenue",
    name: "Revenue Report",
    desc: "Collections, pending & overdue",
    period: "This month",
    columns: ["Metric", "Value"],
    rows: () => [
      { Metric: "Total revenue", Value: ownerRevenue.total },
      { Metric: "Change vs last period", Value: ownerRevenue.delta },
      { Metric: "Collected", Value: ownerRevenue.collected },
      { Metric: "Pending", Value: ownerRevenue.pending },
      { Metric: "Overdue", Value: ownerRevenue.overdue },
    ],
  },
  {
    key: "strength",
    name: "Strength Progress",
    desc: "Aggregate member strength gains",
    period: "Last 90 days",
    columns: ["Member", "Plan", "Trainer", "Churn risk"],
    rows: () =>
      members.map((m) => ({ Member: m.name, Plan: m.plan, Trainer: m.trainer, "Churn risk": m.churnRisk })),
  },
  {
    key: "business",
    name: "Full Business Report",
    desc: "Members, trainers & leads snapshot",
    period: "Q3 2026",
    columns: ["Section", "Detail"],
    rows: () => [
      { Section: "Total members", Detail: members.length },
      { Section: "Total trainers", Detail: trainers.length },
      { Section: "Open leads", Detail: leads.length },
      { Section: "Revenue this month", Detail: ownerRevenue.total },
    ],
  },
];

function toCsv(columns: string[], rows: ReportRow[]) {
  const header = columns.join(",");
  const body = rows
    .map((r) => columns.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [active, setActive] = useState<ReportDef | null>(null);

  return (
    <div>
      <PageHeader title="Reports" subtitle="View in-app or export as CSV / JSON" backTo="/owner" />
      <div className="grid sm:grid-cols-2 gap-4">
        {reports.map((r) => (
          <Card key={r.key} className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-(--color-text)">{r.name}</p>
              <p className="text-xs text-(--color-text-faint) mt-0.5">{r.desc}</p>
              <p className="text-[11px] text-(--color-text-faint) mt-1">{r.period}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setActive(r)}
                title="View in app"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-(--color-surface-3) text-(--color-text-muted) hover:text-(--color-text)"
              >
                <Eye size={16} />
              </button>
              <button
                onClick={() => download(`${r.key}.json`, JSON.stringify(r.rows(), null, 2), "application/json")}
                title="Export JSON"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-(--color-surface-3) text-(--color-text-muted) hover:text-(--color-text)"
              >
                <FileJson size={16} />
              </button>
              <button
                onClick={() => download(`${r.key}.csv`, toCsv(r.columns, r.rows()), "text/csv")}
                title="Export CSV"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-(--color-surface-3) text-(--color-text-muted) hover:text-(--color-text)"
              >
                <FileDown size={16} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setActive(null)} />
          <div className="relative w-full max-w-lg max-h-[80vh] overflow-auto rounded-2xl bg-(--color-surface) border border-(--color-border) shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-(--color-border) sticky top-0 bg-(--color-surface)">
              <div>
                <p className="text-sm font-semibold text-(--color-text)">{active.name}</p>
                <p className="text-xs text-(--color-text-faint)">{active.period}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => download(`${active.key}.csv`, toCsv(active.columns, active.rows()), "text/csv")}
                  className="flex items-center gap-1.5 rounded-full bg-(--color-accent) text-white text-xs font-medium px-3 py-1.5"
                >
                  <FileSpreadsheet size={13} /> Export
                </button>
                <button onClick={() => setActive(null)} className="text-(--color-text-muted)">
                  <X size={18} />
                </button>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-(--color-surface-2)">
                  {active.columns.map((c) => (
                    <th key={c} className="text-left px-4 py-2.5 text-xs font-semibold text-(--color-text-muted)">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {active.rows().map((row, i) => (
                  <tr key={i} className="border-t border-(--color-border-soft)">
                    {active.columns.map((c) => (
                      <td key={c} className="px-4 py-2.5 text-(--color-text)">
                        {row[c]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
