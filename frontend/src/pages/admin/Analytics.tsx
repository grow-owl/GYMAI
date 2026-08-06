import { TrendingUp, DollarSign, Building2, Users, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { useAdminStore } from "@/store/adminStore";

export default function Analytics() {
  const { gyms, branches } = useAdminStore();

  const totalRevenue = gyms.reduce((acc, g) => acc + g.monthlyRevenue, 0);
  const activeGyms = gyms.filter((g) => g.status === "ACTIVE").length;
  const totalMembers = gyms.reduce((acc, g) => acc + g.totalMembers, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-(--color-text) flex items-center gap-2">
          <TrendingUp className="text-(--color-accent)" size={26} /> SaaS Platform Analytics & MRR
        </h1>
        <p className="text-sm text-(--color-text-muted)">
          Real-time insights on platform revenue growth, subscription MRR, active gym tenants, and member throughput.
        </p>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-(--color-border) bg-(--color-surface) space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-(--color-text-muted)">
            <span className="text-xs font-medium uppercase tracking-wider">Monthly Recurring Revenue</span>
            <DollarSign size={18} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-(--color-text)">₹{totalRevenue.toLocaleString("en-IN")}</p>
          <p className="text-xs text-emerald-400 flex items-center gap-1">
            <ArrowUpRight size={14} /> +18.4% from last month
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-(--color-border) bg-(--color-surface) space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-(--color-text-muted)">
            <span className="text-xs font-medium uppercase tracking-wider">Active Gym Tenants</span>
            <Building2 size={18} className="text-blue-400" />
          </div>
          <p className="text-2xl font-extrabold text-(--color-text)">{activeGyms} / {gyms.length}</p>
          <p className="text-xs text-blue-400 flex items-center gap-1">
            <CheckCircle2 size={14} /> {gyms.filter((g) => g.status === "TRIAL").length} Gyms on Trial
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-(--color-border) bg-(--color-surface) space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-(--color-text-muted)">
            <span className="text-xs font-medium uppercase tracking-wider">Total Active Branches</span>
            <Building2 size={18} className="text-purple-400" />
          </div>
          <p className="text-2xl font-extrabold text-(--color-text)">{branches.length}</p>
          <p className="text-xs text-purple-400">Across Delhi NCR & Mumbai</p>
        </div>

        <div className="p-5 rounded-2xl border border-(--color-border) bg-(--color-surface) space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-(--color-text-muted)">
            <span className="text-xs font-medium uppercase tracking-wider">Total SaaS Platform Members</span>
            <Users size={18} className="text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-(--color-text)">{totalMembers}</p>
          <p className="text-xs text-amber-400">Active users across all gyms</p>
        </div>
      </div>

      {/* Revenue Breakdown by Tier */}
      <div className="p-6 rounded-2xl border border-(--color-border) bg-(--color-surface) space-y-4 shadow-sm">
        <h2 className="text-lg font-bold text-(--color-text)">Subscription Plan Tier Distribution</h2>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs font-medium text-(--color-text) mb-1">
              <span>Enterprise Tier (₹2,80,000/mo)</span>
              <span>50% Revenue</span>
            </div>
            <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
              <div className="bg-purple-500 h-full w-1/2 rounded-full" />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-(--color-text) mb-1">
              <span>Pro Tier (₹1,25,000/mo)</span>
              <span>42% Revenue</span>
            </div>
            <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full w-[42%] rounded-full" />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-(--color-text) mb-1">
              <span>Starter Tier (₹18,000/mo)</span>
              <span>8% Revenue</span>
            </div>
            <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-[8%] rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
