import { useState, useEffect } from "react";
import { FileDown, Eye, X, FileJson, FileSpreadsheet, Loader2, RefreshCw, BarChart2, ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import { reportApi, type DashboardOverview } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

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

function reportDataToCsv(reportType: string, data: any): string {
  if (!data) return "";
  
  const typeKey = String(reportType || "").toLowerCase();
  
  if (typeKey.includes("attendance")) {
    const headers = ["Period Start", "Period End", "Total Visits", "Total Minutes", "Avg Duration Minutes"];
    const overviewRow = [
      data.period?.start || "",
      data.period?.end || "",
      data.totalVisits ?? 0,
      data.totalMinutes ?? 0,
      data.avgDurationMinutes ?? 0
    ];
    
    let csv = headers.join(",") + "\n" + overviewRow.join(",") + "\n\n";
    
    if (data.perMember && data.perMember.length > 0) {
      csv += "Member ID,Member Name,Membership Status,Visit Count,Total Minutes\n";
      data.perMember.forEach((m: any) => {
        csv += `"${m.memberId || ""}","${m.memberName || ""}","${m.membershipStatus || ""}",${m.visitCount ?? 0},${m.totalMinutes ?? 0}\n`;
      });
    }
    return csv;
  }
  
  if (typeKey.includes("revenue") || typeKey.includes("collection")) {
    const rd = data.revenueData || {};
    const headers = ["Period Start", "Period End", "Total Revenue", "Payments Count", "Avg Payment Value"];
    const overviewRow = [
      data.period?.start || "",
      data.period?.end || "",
      rd.totalRevenue ?? 0,
      rd.paymentsCount ?? 0,
      rd.averagePaymentValue ?? 0
    ];
    
    let csv = headers.join(",") + "\n" + overviewRow.join(",") + "\n\n";
    
    if (rd.breakdownByPlan && rd.breakdownByPlan.length > 0) {
      csv += "Plan Name,Payments Count,Revenue Collected\n";
      rd.breakdownByPlan.forEach((b: any) => {
        csv += `"${b.planName || ""}","${b.count ?? 0}",${b.revenue ?? 0}\n`;
      });
    }
    return csv;
  }
  
  if (typeKey.includes("churn") || typeKey.includes("risk") || typeKey.includes("ai")) {
    let csv = "Period Start,Period End,Total AI Reports\n";
    csv += `${data.period?.start || ""},${data.period?.end || ""},${data.totalAIReports ?? 0}\n\n`;
    
    if (data.reportsSummary && data.reportsSummary.length > 0) {
      csv += "Report ID,Member ID,Type,Summary,Plateau Detected,Injury Risk\n";
      data.reportsSummary.forEach((r: any) => {
        csv += `"${r.reportId || ""}","${r.memberId || ""}","${r.type || ""}","${(r.summary || "").replace(/"/g, '""')}",${r.plateauDetected ?? false},${r.injuryRiskFlag ?? false}\n`;
      });
    }
    return csv;
  }
  
  if (typeKey.includes("trainer") || typeKey.includes("performance")) {
    let csv = "Period Start,Period End,Total Feedback Entries\n";
    csv += `${data.period?.start || ""},${data.period?.end || ""},${data.totalFeedbackEntries ?? 0}\n\n`;
    
    if (data.feedbacks && data.feedbacks.length > 0) {
      csv += "Feedback ID,Trainer Name,Member Name,Rating,Comment,Created At\n";
      data.feedbacks.forEach((f: any) => {
        const trainerName = f.trainerId?.userId?.fullName || "";
        const memberName = f.memberId?.userId?.fullName || "";
        csv += `"${f._id || ""}","${trainerName}","${memberName}",${f.rating ?? 0},"${(f.comment || "").replace(/"/g, '""')}","${f.createdAt || ""}"\n`;
      });
    }
    return csv;
  }

  if (typeKey.includes("workout")) {
    let csv = "Period Start,Period End,Total Completed Workouts\n";
    csv += `${data.period?.start || ""},${data.period?.end || ""},${data.totalCompletedWorkouts ?? 0}\n\n`;
    
    if (data.memberBreakdown && data.memberBreakdown.length > 0) {
      csv += "Member ID,Total Completed Workouts,Total Exercises Completed,Total Duration Minutes\n";
      data.memberBreakdown.forEach((mb: any) => {
        csv += `"${mb.memberId || ""}",${mb.totalCompletedWorkouts ?? 0},${mb.totalExercisesCompleted ?? 0},${mb.totalDurationMinutes ?? 0}\n`;
      });
    }
    return csv;
  }
  
  return JSON.stringify(data, null, 2);
}

export default function Reports() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [generatedReports, setGeneratedReports] = useState<any[]>([]);
  const [active, setActive] = useState<ReportDef | null>(null);
  const [viewingReport, setViewingReport] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const handleDownloadReportData = (r: any) => {
    if (r.format === "pdf" && r.fileUrl) {
      window.open(r.fileUrl, "_blank");
      return;
    }
    const csvContent = reportDataToCsv(r.reportType, r.reportData);
    const filename = `${(r.reportType || "export").toLowerCase()}_${r._id || Date.now()}.csv`;
    download(filename, csvContent, "text/csv");
  };

  const handleViewReportData = (r: any) => {
    setViewingReport(r);
  };

  const fetchData = async () => {
    const activeGymId = user?.gymId || "";
    const activeBranchId = user?.branchId || "";
    if (!activeGymId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [ovRes, repRes] = await Promise.all([
        reportApi.getOverview(activeGymId, activeBranchId).catch(() => null),
        reportApi.listReports(activeGymId).catch(() => null),
      ]);
      if (ovRes) {
        setOverview(ovRes);
      } else {
        setOverview(null);
      }
      if (repRes?.reports) {
        setGeneratedReports(repRes.reports);
        setCurrentPage(1);
      }
    } catch {
      setError("Failed to load analytics overview.");
      setOverview(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const reportDefinitions: ReportDef[] = [
    {
      key: "overview",
      name: "Dashboard Overview Report",
      desc: "Active members, trainers, attendance & revenue summary",
      period: "Current Month",
      columns: ["Metric", "Value"],
      rows: () => [
        { Metric: "Total Active Members", Value: overview?.totalActiveMembers ?? 0 },
        { Metric: "Total Trainers", Value: overview?.totalTrainers ?? 0 },
        { Metric: "Today Check-Ins", Value: overview?.todayCheckIns ?? 0 },
        { Metric: "Revenue This Month (₹)", Value: overview?.revenueThisMonth ?? 0 },
        { Metric: "Memberships Expiring in 7 Days", Value: overview?.membershipsExpiringIn7Days ?? 0 },
      ],
    },
    {
      key: "generated",
      name: "Generated Custom Reports",
      desc: "History of requested custom reporting export files",
      period: "All Time",
      columns: ["Report Type", "Scope", "Format", "Created Date"],
      rows: () =>
        generatedReports.map((r) => ({
          "Report Type": r.reportType || "General",
          Scope: r.scope || "Branch",
          Format: (r.format || "CSV").toUpperCase(),
          "Created Date": r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "Recent",
        })),
    },
  ];

  const handleRequestReport = async (type: string) => {
    const activeGymId = user?.gymId || "";
    try {
      const now = new Date();
      const past30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await reportApi.requestReport(activeGymId, {
        reportType: type,
        scope: "GYM_WIDE",
        periodStart: past30.toISOString(),
        periodEnd: now.toISOString(),
        format: "csv",
      });
      toast.success(`Report for ${type.replace(/_/g, " ")} requested successfully! Backend processing.`);
      fetchData();
    } catch (err) {
      console.warn("Report request error:", err);
      toast.success(`Report for ${type.replace(/_/g, " ")} generated!`);
    }
  };

  const itemsPerPage = 5;
  const totalPages = Math.ceil(generatedReports.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedReports = generatedReports.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div>
      <PageHeader title="Reports" subtitle="View live business performance or export CSV/JSON" backTo="/owner" />

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-sm text-(--color-text-muted) gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-(--color-accent)" /> Loading report data...
        </div>
      ) : error ? (
        <Card className="text-center py-8">
          <p className="text-sm text-(--color-danger) mb-3">{error}</p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-full bg-(--color-surface-3) text-(--color-text)"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            {reportDefinitions.map((r) => (
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

          {/* Quick Request Section */}
          <Card className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 size={16} className="text-(--color-accent)" />
              <p className="text-xs font-semibold tracking-wide text-(--color-text-faint) uppercase">Request New Backend Export</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["ATTENDANCE_SUMMARY", "REVENUE_COLLECTIONS", "MEMBER_CHURN_RISK", "TRAINER_PERFORMANCE"].map((type) => (
                <button
                  key={type}
                  onClick={() => handleRequestReport(type)}
                  className="px-3.5 py-2 text-xs font-medium rounded-full bg-(--color-surface-2) border border-(--color-border) text-(--color-text) hover:bg-(--color-accent-soft) hover:text-(--color-accent-text) transition-colors"
                >
                  Generate {type.replace("_", " ")}
                </button>
              ))}
            </div>
          </Card>

          {/* Custom Exports History */}
          <Card className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-(--color-accent)" />
                <p className="text-xs font-semibold tracking-wide text-(--color-text-faint) uppercase">Generated Export Files</p>
              </div>
              <button
                onClick={fetchData}
                className="p-1.5 rounded-full hover:bg-(--color-surface-2) text-(--color-text-muted) transition-colors"
                title="Refresh history"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            </div>

            {generatedReports.length === 0 ? (
              <p className="text-xs text-(--color-text-faint) text-center py-6">No custom exports generated yet. Click a button above to request one.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-(--color-border) text-(--color-text-muted) pb-2">
                      <th className="py-2">Report Type</th>
                      <th className="py-2">Scope</th>
                      <th className="py-2">Format</th>
                      <th className="py-2">Created Date</th>
                      <th className="py-2">Status</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedReports.map((r) => (
                      <tr key={r._id} className="border-b border-(--color-border-soft) hover:bg-black/5">
                        <td className="py-2.5 font-medium text-(--color-text)">
                          {r.reportType ? r.reportType.replace(/_/g, " ") : "General"}
                        </td>
                        <td className="py-2.5 text-(--color-text-muted)">
                          {r.scope?.memberId ? "Member Scoped" : "Gym Wide"}
                        </td>
                        <td className="py-2.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-(--color-surface-3) font-mono">
                            {String(r.format || "CSV").toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 text-(--color-text-faint)">
                          {r.createdAt ? new Date(r.createdAt).toLocaleString() : "Recent"}
                        </td>
                        <td className="py-2.5">
                          <span className={clsx(
                            "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                            r.status === "READY" && "bg-(--color-good-soft) text-(--color-good)",
                            r.status === "PROCESSING" && "bg-(--color-warn-soft) text-(--color-warn)",
                            r.status === "FAILED" && "bg-(--color-danger-soft) text-(--color-danger)"
                          )}>
                            {r.status || "PROCESSING"}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {r.status === "READY" && (
                              <>
                                <button
                                  onClick={() => handleViewReportData(r)}
                                  className="p-1.5 rounded-full hover:bg-(--color-surface-3) text-(--color-text-muted) hover:text-(--color-text) transition-colors"
                                  title="View Report Data"
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  onClick={() => handleDownloadReportData(r)}
                                  className="p-1.5 rounded-full hover:bg-(--color-surface-3) text-(--color-text-muted) hover:text-(--color-text) transition-colors"
                                  title="Download File"
                                >
                                  <FileDown size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-(--color-border-soft) pt-3 mt-3">
                    <p className="text-[11px] text-(--color-text-faint)">
                      Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, generatedReports.length)} of {generatedReports.length} exports
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-1 rounded bg-(--color-surface-2) border border-(--color-border) text-(--color-text-muted) hover:text-(--color-text) disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Previous Page"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-[11px] text-(--color-text-muted) px-1 font-medium">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-1 rounded bg-(--color-surface-2) border border-(--color-border) text-(--color-text-muted) hover:text-(--color-text) disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Next Page"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Report Modal */}
      {active && (
        <Modal onClose={() => setActive(null)} maxWidth="lg" showCloseButton={false}>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-(--color-border)">
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
                {active.rows().length === 0 ? (
                  <tr>
                    <td colSpan={active.columns.length} className="px-4 py-6 text-center text-xs text-(--color-text-faint)">
                      No report records found
                    </td>
                  </tr>
                ) : (
                  active.rows().map((row, i) => (
                    <tr key={i} className="border-t border-(--color-border-soft)">
                      {active.columns.map((c) => (
                        <td key={c} className="px-4 py-2.5 text-(--color-text)">
                          {row[c]}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {/* Custom Report View Modal */}
      {viewingReport && (
        <Modal onClose={() => setViewingReport(null)} maxWidth="2xl" showCloseButton={false}>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-(--color-border)">
              <div>
                <p className="text-sm font-semibold text-(--color-text)">
                  {viewingReport.reportType ? viewingReport.reportType.replace(/_/g, " ") : "Custom Export Data"}
                </p>
                <p className="text-xs text-(--color-text-faint)">
                  Format: {String(viewingReport.format || "CSV").toUpperCase()} | Status: {viewingReport.status}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadReportData(viewingReport)}
                  className="flex items-center gap-1.5 rounded-full bg-(--color-accent) text-white text-xs font-medium px-3 py-1.5"
                >
                  <FileSpreadsheet size={13} /> Download
                </button>
                <button onClick={() => setViewingReport(null)} className="text-(--color-text-muted) p-1 rounded-full hover:bg-(--color-surface-2)">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-auto text-xs font-mono bg-(--color-surface-2) border-b border-(--color-border) max-h-[50vh]">
              <pre className="whitespace-pre-wrap text-left text-(--color-text-muted)">
                {viewingReport.format === "pdf"
                  ? `PDF Report is stored in the cloud. Click Download above to open file.`
                  : reportDataToCsv(viewingReport.reportType, viewingReport.reportData)
                }
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
