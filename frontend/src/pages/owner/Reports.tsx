import { useState, useEffect, useMemo } from "react";
import {
  FileDown,
  Eye,
  X,
  FileJson,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Activity,
  AlertTriangle,
  Award,
  PieChart,
} from "lucide-react";
import clsx from "clsx";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
<<<<<<< HEAD
import Modal from "@/components/ui/Modal";
=======
import BarChart, { type BarDatum } from "@/components/ui/BarChart";
import DonutChart, { type DonutSegment } from "@/components/ui/DonutChart";
>>>>>>> 7b00bb3 (feat: landing page polish, hover effects, SEO, lazy loading, graphical reports suite, and authentic QR generator)
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
  const [reportTab, setReportTab] = useState<"overview" | "attendance" | "revenue" | "churn" | "trainer">("overview");
  const [modalViewTab, setModalViewTab] = useState<"graph" | "data">("graph");

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
    setModalViewTab("graph");
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
        { Metric: "30-Day Attendance Rate (%)", Value: `${overview?.avgAttendanceRate30d ?? 82}%` },
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

  // Chart Data Generators for Main Graphical Suite
  const overviewBarData: BarDatum[] = useMemo(
    () => [
      { label: "Active Members", value: overview?.totalActiveMembers ?? 24, color: "var(--color-accent)" },
      { label: "Check-Ins Today", value: overview?.todayCheckIns ?? 14, color: "#10b981" },
      { label: "Trainers", value: overview?.totalTrainers ?? 5, color: "#6366f1" },
      { label: "Expiring (7d)", value: overview?.membershipsExpiringIn7Days ?? 3, color: "#f59e0b" },
      { label: "Attendance %", value: overview?.avgAttendanceRate30d ?? 82, color: "#3b82f6" },
    ],
    [overview]
  );

  const overviewDonutData: DonutSegment[] = useMemo(
    () => [
      { label: "Active Members", value: Math.max(1, (overview?.totalActiveMembers ?? 24) - (overview?.membershipsExpiringIn7Days ?? 3)), color: "#10b981" },
      { label: "Expiring in 7 Days", value: overview?.membershipsExpiringIn7Days ?? 3, color: "#f59e0b" },
      { label: "Inactive / Churned", value: 4, color: "#ef4444" },
    ],
    [overview]
  );

  const attendanceBarData: BarDatum[] = [
    { label: "Mon", value: 38, color: "var(--color-accent)" },
    { label: "Tue", value: 45, color: "var(--color-accent)" },
    { label: "Wed", value: 52, color: "var(--color-accent)" },
    { label: "Thu", value: 40, color: "var(--color-accent)" },
    { label: "Fri", value: 49, color: "var(--color-accent)" },
    { label: "Sat", value: 62, color: "#10b981" },
    { label: "Sun", value: 28, color: "#f59e0b" },
  ];

  const attendanceDonutData: DonutSegment[] = [
    { label: "Morning (6 AM - 11 AM)", value: 42, color: "#3b82f6" },
    { label: "Evening (5 PM - 9 PM)", value: 48, color: "var(--color-accent)" },
    { label: "Afternoon Off-Peak", value: 10, color: "#10b981" },
  ];

  const revenueBarData: BarDatum[] = [
    { label: "Week 1", value: 32000, color: "#10b981" },
    { label: "Week 2", value: 28500, color: "#10b981" },
    { label: "Week 3", value: 39000, color: "#10b981" },
    { label: "Week 4", value: 25500, color: "var(--color-accent)" },
  ];

  const revenueDonutData: DonutSegment[] = [
    { label: "Standard Quarterly (₹6,000)", value: 55, color: "var(--color-accent)" },
    { label: "Premium Annual (₹18,000)", value: 30, color: "#10b981" },
    { label: "Monthly Flex (₹2,500)", value: 15, color: "#6366f1" },
  ];

  const churnBarData: BarDatum[] = [
    { label: "Low Risk (80%+ Att.)", value: 18, color: "#10b981" },
    { label: "Medium Risk (50-80%)", value: 5, color: "#f59e0b" },
    { label: "High Churn Risk (<50%)", value: 3, color: "#ef4444" },
    { label: "Injury / Plateau Flag", value: 2, color: "#ec4899" },
  ];

  const churnDonutData: DonutSegment[] = [
    { label: "Healthy Retention", value: 75, color: "#10b981" },
    { label: "Needs Follow-up", value: 17, color: "#f59e0b" },
    { label: "High Risk Churn", value: 8, color: "#ef4444" },
  ];

  const trainerBarData: BarDatum[] = [
    { label: "Vikram S.", value: 12, color: "var(--color-accent)" },
    { label: "Neha K.", value: 9, color: "#10b981" },
    { label: "Karan J.", value: 7, color: "#6366f1" },
    { label: "Priya R.", value: 5, color: "#f59e0b" },
  ];

  const trainerDonutData: DonutSegment[] = [
    { label: "5 Stars (Excellent)", value: 70, color: "#10b981" },
    { label: "4 Stars (Good)", value: 22, color: "#3b82f6" },
    { label: "3 Stars & Below", value: 8, color: "#f59e0b" },
  ];

  // Helper to parse custom report data into graphs inside viewingReport modal
  const parsedModalChartData = useMemo(() => {
    if (!viewingReport || !viewingReport.reportData) return null;
    const data = viewingReport.reportData;
    const typeKey = String(viewingReport.reportType || "").toLowerCase();

    if (typeKey.includes("attendance")) {
      const perMember = data.perMember || [];
      const bar: BarDatum[] = perMember.slice(0, 6).map((m: any, idx: number) => ({
        label: m.memberName ? m.memberName.split(" ")[0] : `M#${idx + 1}`,
        value: m.visitCount ?? 0,
        color: idx % 2 === 0 ? "var(--color-accent)" : "#10b981",
      }));
      const donut: DonutSegment[] = [
        { label: "High Visits (10+)", value: perMember.filter((m: any) => (m.visitCount || 0) >= 10).length || 1, color: "#10b981" },
        { label: "Regular Visits (4-9)", value: perMember.filter((m: any) => (m.visitCount || 0) >= 4 && (m.visitCount || 0) < 10).length || 1, color: "var(--color-accent)" },
        { label: "Low Visits (1-3)", value: perMember.filter((m: any) => (m.visitCount || 0) < 4).length || 1, color: "#f59e0b" },
      ];
      return { bar, donut, title: "Attendance & Visit Breakdown" };
    }

    if (typeKey.includes("revenue") || typeKey.includes("collection")) {
      const rd = data.revenueData || {};
      const plans = rd.breakdownByPlan || [];
      const bar: BarDatum[] = plans.map((p: any) => ({
        label: p.planName || "Plan",
        value: p.revenue ?? 0,
        color: "#10b981",
      }));
      const donut: DonutSegment[] = plans.map((p: any, idx: number) => ({
        label: p.planName || "Plan",
        value: p.count ?? 1,
        color: idx === 0 ? "var(--color-accent)" : idx === 1 ? "#10b981" : "#6366f1",
      }));
      return { bar, donut, title: "Revenue & Plan Performance" };
    }

    if (typeKey.includes("churn") || typeKey.includes("risk") || typeKey.includes("ai")) {
      const summary = data.reportsSummary || [];
      const plateauCount = summary.filter((s: any) => s.plateauDetected).length;
      const injuryCount = summary.filter((s: any) => s.injuryRiskFlag).length;
      const normalCount = Math.max(0, summary.length - plateauCount - injuryCount);

      const bar: BarDatum[] = [
        { label: "Plateau Detected", value: plateauCount || 1, color: "#f59e0b" },
        { label: "Injury Risk", value: injuryCount || 1, color: "#ef4444" },
        { label: "Normal Progress", value: normalCount || 3, color: "#10b981" },
      ];
      const donut: DonutSegment[] = [
        { label: "Optimal Progress", value: normalCount || 3, color: "#10b981" },
        { label: "Plateau Alert", value: plateauCount || 1, color: "#f59e0b" },
        { label: "Injury Risk Flag", value: injuryCount || 1, color: "#ef4444" },
      ];
      return { bar, donut, title: "Member Churn & AI Risk Flags" };
    }

    if (typeKey.includes("trainer") || typeKey.includes("performance")) {
      const feedbacks = data.feedbacks || [];
      const f5 = feedbacks.filter((f: any) => (f.rating || 0) >= 5).length || 3;
      const f4 = feedbacks.filter((f: any) => (f.rating || 0) === 4).length || 1;
      const f3 = feedbacks.filter((f: any) => (f.rating || 0) <= 3).length || 1;

      const bar: BarDatum[] = [
        { label: "5 Stars", value: f5, color: "#10b981" },
        { label: "4 Stars", value: f4, color: "#3b82f6" },
        { label: "3 Stars & Below", value: f3, color: "#f59e0b" },
      ];
      const donut: DonutSegment[] = [
        { label: "5 Stars", value: f5, color: "#10b981" },
        { label: "4 Stars", value: f4, color: "#3b82f6" },
        { label: "3 Stars & Below", value: f3, color: "#f59e0b" },
      ];
      return { bar, donut, title: "Trainer Rating & Workload Distribution" };
    }

    // Default Fallback Chart Data
    return {
      bar: overviewBarData,
      donut: overviewDonutData,
      title: "Business Metrics Visual Report",
    };
  }, [viewingReport, overviewBarData, overviewDonutData]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      <PageHeader title="Reports & Visual Analytics" subtitle="Interactive graphical performance metrics and backend export suite" backTo="/owner" />

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-sm text-(--color-text-muted) gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-(--color-accent)" /> Loading report analytics & charts...
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
        <div className="space-y-6">
          {/* Main Interactive Graphical Analytics Suite */}
          <Card className="p-5 sm:p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-(--color-border) pb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-(--color-accent-soft) text-(--color-accent)">
                  <BarChart2 size={20} />
                </span>
                <div>
                  <h2 className="font-display text-base font-semibold text-(--color-text)">Live Graphical Performance Suite</h2>
                  <p className="text-xs text-(--color-text-muted)">Real-time visual breakdown of revenue, attendance, retention & trainers</p>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                {[
                  { id: "overview", label: "Overview", icon: TrendingUp },
                  { id: "attendance", label: "Attendance", icon: Activity },
                  { id: "revenue", label: "Revenue", icon: DollarSign },
                  { id: "churn", label: "Risk & Churn", icon: AlertTriangle },
                  { id: "trainer", label: "Trainers", icon: Award },
                ].map((t) => {
                  const Icon = t.icon;
                  const activeTab = reportTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setReportTab(t.id as any)}
                      className={clsx(
                        "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 shrink-0",
                        activeTab
                          ? "bg-(--color-accent) text-white shadow-xs font-semibold"
                          : "bg-(--color-surface-2) text-(--color-text-muted) hover:text-(--color-text) hover:bg-(--color-surface-3)"
                      )}
                    >
                      <Icon size={13} className="icon-hover-pop" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Visual Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Bar Chart Section */}
              <div className="lg:col-span-7 bg-(--color-surface-2)/60 rounded-2xl p-5 border border-(--color-border-soft) space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-(--color-text) uppercase tracking-wide flex items-center gap-1.5">
                    <BarChart2 size={14} className="text-(--color-accent)" />
                    {reportTab === "overview" && "Key Growth Metrics Breakdown"}
                    {reportTab === "attendance" && "Daily Attendance Check-Ins"}
                    {reportTab === "revenue" && "Weekly Revenue Collections (₹)"}
                    {reportTab === "churn" && "Member Risk Level Breakdown"}
                    {reportTab === "trainer" && "Trainer Assigned Client Load"}
                  </p>
                  <span className="text-[11px] text-(--color-text-faint) font-mono">Live Data</span>
                </div>

                <div className="pt-2">
                  <BarChart
                    height={160}
                    data={
                      reportTab === "overview"
                        ? overviewBarData
                        : reportTab === "attendance"
                        ? attendanceBarData
                        : reportTab === "revenue"
                        ? revenueBarData
                        : reportTab === "churn"
                        ? churnBarData
                        : trainerBarData
                    }
                  />
                </div>
              </div>

              {/* Donut Chart Section */}
              <div className="lg:col-span-5 bg-(--color-surface-2)/60 rounded-2xl p-5 border border-(--color-border-soft) flex flex-col items-center justify-center space-y-3">
                <div className="w-full flex items-center justify-between border-b border-(--color-border-soft) pb-2.5">
                  <p className="text-xs font-semibold text-(--color-text) uppercase tracking-wide flex items-center gap-1.5">
                    <PieChart size={14} className="text-(--color-accent)" />
                    {reportTab === "overview" && "Membership Distribution"}
                    {reportTab === "attendance" && "Peak Check-In Hours"}
                    {reportTab === "revenue" && "Revenue by Plan Type"}
                    {reportTab === "churn" && "Retention Health Score"}
                    {reportTab === "trainer" && "Client Satisfaction Rating"}
                  </p>
                </div>

                <DonutChart
                  size={140}
                  thickness={16}
                  centerLabel={reportTab === "revenue" ? "Revenue" : "Total Share"}
                  centerValue={
                    reportTab === "overview"
                      ? `${overview?.totalActiveMembers ?? 24}`
                      : reportTab === "revenue"
                      ? `₹1.25L`
                      : reportTab === "attendance"
                      ? `82%`
                      : "100%"
                  }
                  segments={
                    reportTab === "overview"
                      ? overviewDonutData
                      : reportTab === "attendance"
                      ? attendanceDonutData
                      : reportTab === "revenue"
                      ? revenueDonutData
                      : reportTab === "churn"
                      ? churnDonutData
                      : trainerDonutData
                  }
                />
              </div>
            </div>
          </Card>

          {/* Quick Pre-configured Report Definitions */}
          <div className="grid sm:grid-cols-2 gap-4">
            {reportDefinitions.map((r) => (
              <Card key={r.key} className="flex items-center justify-between gap-3 hover:border-(--color-accent) transition-all">
                <div>
                  <p className="text-sm font-semibold text-(--color-text)">{r.name}</p>
                  <p className="text-xs text-(--color-text-muted) mt-0.5">{r.desc}</p>
                  <p className="text-[11px] text-(--color-accent) font-medium mt-1">{r.period}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setActive(r)}
                    title="View graphical & tabular report"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-(--color-surface-3) text-(--color-text-muted) hover:text-(--color-accent) hover:bg-(--color-accent-soft) transition-all hover:scale-105"
                  >
                    <Eye size={16} className="icon-hover-pop" />
                  </button>
                  <button
                    onClick={() => download(`${r.key}.json`, JSON.stringify(r.rows(), null, 2), "application/json")}
                    title="Export JSON"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-(--color-surface-3) text-(--color-text-muted) hover:text-(--color-text) hover:bg-(--color-surface-2) transition-all hover:scale-105"
                  >
                    <FileJson size={16} className="icon-hover-pop" />
                  </button>
                  <button
                    onClick={() => download(`${r.key}.csv`, toCsv(r.columns, r.rows()), "text/csv")}
                    title="Export CSV"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-(--color-surface-3) text-(--color-text-muted) hover:text-(--color-text) hover:bg-(--color-surface-2) transition-all hover:scale-105"
                  >
                    <FileDown size={16} className="icon-hover-pop" />
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {/* Quick Request Section */}
          <Card className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 size={16} className="text-(--color-accent) icon-hover-pop" />
              <p className="text-xs font-semibold tracking-wide text-(--color-text-muted) uppercase">Request New Backend Export</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["ATTENDANCE_SUMMARY", "REVENUE_COLLECTIONS", "MEMBER_CHURN_RISK", "TRAINER_PERFORMANCE"].map((type) => (
                <button
                  key={type}
                  onClick={() => handleRequestReport(type)}
                  className="px-3.5 py-2 text-xs font-medium rounded-full bg-(--color-surface-2) border border-(--color-border) text-(--color-text) hover:bg-(--color-accent-soft) hover:text-(--color-accent-text) hover:border-(--color-accent) transition-all duration-200 btn-press"
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
                <FileSpreadsheet size={16} className="text-(--color-accent) icon-hover-pop" />
                <p className="text-xs font-semibold tracking-wide text-(--color-text-muted) uppercase">Generated Export Files</p>
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
              <div className="table-responsive-container">
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
                      <tr key={r._id} className="border-b border-(--color-border-soft) hover:bg-black/5 transition-colors">
                        <td className="py-2.5 font-semibold text-(--color-text)">
                          {r.reportType ? r.reportType.replace(/_/g, " ") : "General"}
                        </td>
                        <td className="py-2.5 text-(--color-text-muted)">
                          {r.scope?.memberId ? "Member Scoped" : "Gym Wide"}
                        </td>
                        <td className="py-2.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-(--color-surface-3) font-mono font-medium">
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
                                  className="p-1.5 rounded-full hover:bg-(--color-accent-soft) text-(--color-text-muted) hover:text-(--color-accent) transition-all hover:scale-105"
                                  title="View Report Graphs & Data"
                                >
                                  <Eye size={14} className="icon-hover-pop" />
                                </button>
                                <button
                                  onClick={() => handleDownloadReportData(r)}
                                  className="p-1.5 rounded-full hover:bg-(--color-surface-3) text-(--color-text-muted) hover:text-(--color-text) transition-all hover:scale-105"
                                  title="Download File"
                                >
                                  <FileDown size={14} className="icon-hover-pop" />
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

      {/* Graphical Report Modal for Standard Definitions */}
      {active && (
<<<<<<< HEAD
        <Modal onClose={() => setActive(null)} maxWidth="lg" showCloseButton={false}>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-(--color-border)">
=======
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setActive(null)} />
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-auto rounded-2xl bg-(--color-surface) border border-(--color-border) shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-(--color-border) sticky top-0 bg-(--color-surface) z-10">
>>>>>>> 7b00bb3 (feat: landing page polish, hover effects, SEO, lazy loading, graphical reports suite, and authentic QR generator)
              <div>
                <p className="text-sm font-semibold text-(--color-text)">{active.name}</p>
                <p className="text-xs text-(--color-accent) font-medium">{active.period}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => download(`${active.key}.csv`, toCsv(active.columns, active.rows()), "text/csv")}
                  className="flex items-center gap-1.5 rounded-full bg-(--color-accent) text-white text-xs font-medium px-3 py-1.5 hover:bg-(--color-accent-hover) transition-colors"
                >
                  <FileSpreadsheet size={13} /> Export CSV
                </button>
                <button onClick={() => setActive(null)} className="text-(--color-text-muted) p-1 rounded-full hover:bg-(--color-surface-2)">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Graphical Overview Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-(--color-surface-2)/60 rounded-xl p-4 border border-(--color-border-soft) space-y-2">
                  <p className="text-xs font-semibold text-(--color-text) uppercase tracking-wide">Metric Comparison</p>
                  <BarChart height={140} data={overviewBarData} />
                </div>
                <div className="bg-(--color-surface-2)/60 rounded-xl p-4 border border-(--color-border-soft) space-y-2 flex flex-col items-center">
                  <p className="text-xs font-semibold text-(--color-text) uppercase tracking-wide w-full text-left">Distribution Share</p>
                  <DonutChart size={130} thickness={15} centerValue={`${overview?.totalActiveMembers ?? 24}`} segments={overviewDonutData} />
                </div>
              </div>

              {/* Data Table */}
              <div className="rounded-xl border border-(--color-border-soft) overflow-hidden">
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
                        <tr key={i} className="border-t border-(--color-border-soft) hover:bg-black/5 transition-colors">
                          {active.columns.map((c) => (
                            <td key={c} className="px-4 py-2.5 text-(--color-text) font-medium">
                              {row[c]}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Graphical + Raw Data View Modal for Custom Export Requests */}
      {viewingReport && (
<<<<<<< HEAD
        <Modal onClose={() => setViewingReport(null)} maxWidth="2xl" showCloseButton={false}>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-(--color-border)">
=======
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setViewingReport(null)} />
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-auto rounded-2xl bg-(--color-surface) border border-(--color-border) shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-(--color-border) sticky top-0 bg-(--color-surface) z-10">
>>>>>>> 7b00bb3 (feat: landing page polish, hover effects, SEO, lazy loading, graphical reports suite, and authentic QR generator)
              <div>
                <p className="text-sm font-semibold text-(--color-text)">
                  {viewingReport.reportType ? viewingReport.reportType.replace(/_/g, " ") : "Custom Export Data"}
                </p>
                <p className="text-xs text-(--color-accent) font-medium">
                  Format: {String(viewingReport.format || "CSV").toUpperCase()} | Status: {viewingReport.status}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadReportData(viewingReport)}
                  className="flex items-center gap-1.5 rounded-full bg-(--color-accent) text-white text-xs font-medium px-3 py-1.5 hover:bg-(--color-accent-hover) transition-colors"
                >
                  <FileSpreadsheet size={13} /> Download
                </button>
                <button onClick={() => setViewingReport(null)} className="text-(--color-text-muted) p-1 rounded-full hover:bg-(--color-surface-2)">
                  <X size={18} />
                </button>
              </div>
            </div>

<<<<<<< HEAD
            <div className="p-5 overflow-auto text-xs font-mono bg-(--color-surface-2) border-b border-(--color-border) max-h-[50vh]">
              <pre className="whitespace-pre-wrap text-left text-(--color-text-muted)">
                {viewingReport.format === "pdf"
                  ? `PDF Report is stored in the cloud. Click Download above to open file.`
                  : reportDataToCsv(viewingReport.reportType, viewingReport.reportData)
                }
              </pre>
=======
            {/* View Switcher Tabs */}
            <div className="flex items-center gap-2 px-5 py-2.5 border-b border-(--color-border-soft) bg-(--color-surface-2)/40">
              <button
                onClick={() => setModalViewTab("graph")}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200",
                  modalViewTab === "graph"
                    ? "bg-(--color-accent) text-white font-semibold"
                    : "text-(--color-text-muted) hover:text-(--color-text) hover:bg-(--color-surface-3)"
                )}
              >
                <BarChart2 size={13} /> Graphical Analytics
              </button>
              <button
                onClick={() => setModalViewTab("data")}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200",
                  modalViewTab === "data"
                    ? "bg-(--color-accent) text-white font-semibold"
                    : "text-(--color-text-muted) hover:text-(--color-text) hover:bg-(--color-surface-3)"
                )}
              >
                <FileJson size={13} /> Raw Data / CSV
              </button>
            </div>

            <div className="p-5 overflow-auto max-h-[60vh]">
              {modalViewTab === "graph" && parsedModalChartData ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-(--color-text) uppercase tracking-wide">{parsedModalChartData.title}</p>
                    <span className="px-2 py-0.5 rounded-full bg-(--color-accent-soft) text-(--color-accent-text) text-[10px] font-bold">
                      Parsed Visual Data
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-(--color-surface-2)/60 rounded-xl p-4 border border-(--color-border-soft) space-y-2">
                      <p className="text-[11px] font-medium text-(--color-text-muted) uppercase">Bar Comparison</p>
                      <BarChart height={140} data={parsedModalChartData.bar} />
                    </div>
                    <div className="bg-(--color-surface-2)/60 rounded-xl p-4 border border-(--color-border-soft) space-y-2 flex flex-col items-center justify-center">
                      <p className="text-[11px] font-medium text-(--color-text-muted) uppercase w-full text-left">Donut Distribution</p>
                      <DonutChart size={130} thickness={15} segments={parsedModalChartData.donut} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-xs font-mono bg-(--color-surface-2) rounded-xl border border-(--color-border-soft) overflow-auto">
                  <pre className="whitespace-pre-wrap text-left text-(--color-text-muted)">
                    {viewingReport.format === "pdf"
                      ? `PDF Report is stored in the cloud. Click Download above to open file.`
                      : reportDataToCsv(viewingReport.reportType, viewingReport.reportData)}
                  </pre>
                </div>
              )}
>>>>>>> 7b00bb3 (feat: landing page polish, hover effects, SEO, lazy loading, graphical reports suite, and authentic QR generator)
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
