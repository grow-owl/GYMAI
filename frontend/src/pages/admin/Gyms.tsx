import { useState } from "react";
import { Building2, Search, Plus, Filter, ShieldCheck, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { useAdminStore } from "@/store/adminStore";
import { useFormValidation } from "@/lib/useFormValidation";

export default function Gyms() {
  const { gyms, searchQuery, statusFilter, setSearchQuery, setStatusFilter, toggleGymStatus, addGym } = useAdminStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { values, errors, touched, handleChange, handleBlur, validateAll, resetForm } = useFormValidation(
    {
      name: "",
      ownerName: "",
      ownerEmail: "",
      ownerPhone: "",
      subscriptionPlan: "STARTER" as "STARTER" | "PRO" | "ENTERPRISE",
    },
    {
      name: { required: "Gym name is required" },
      ownerName: { required: "Owner name is required" },
      ownerEmail: { required: "Owner email is required", email: "Enter a valid email address" },
      ownerPhone: { required: "Phone is required", phone: "Enter a valid 10-digit mobile number" },
    }
  );

  const filteredGyms = gyms.filter((gym) => {
    const matchesSearch =
      gym.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gym.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gym.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || gym.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateGym = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;

    addGym({
      name: values.name,
      ownerName: values.ownerName,
      ownerEmail: values.ownerEmail,
      ownerPhone: values.ownerPhone,
      subscriptionPlan: values.subscriptionPlan,
      status: "ACTIVE",
      branchesCount: 1,
      totalMembers: 0,
      monthlyRevenue: 0,
    });

    setIsModalOpen(false);
    resetForm();
    setToastMessage(`Gym "${values.name}" successfully onboarded to the SaaS platform!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-(--color-text) flex items-center gap-2">
            <Building2 className="text-(--color-accent)" size={26} /> Gym Tenants Management
          </h1>
          <p className="text-sm text-(--color-text-muted)">
            Manage all registered gym accounts, subscription plans, and tenant access across the SaaS platform.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-(--color-accent) text-white font-medium rounded-xl hover:bg-(--color-accent-strong) transition-colors shadow-lg shadow-(--color-accent-soft)"
        >
          <Plus size={18} /> Onboard New Gym
        </button>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-3 animate-fade-in">
          <CheckCircle2 size={20} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-text-faint)" />
          <input
            type="text"
            placeholder="Search gym by name, owner or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-(--color-border) bg-(--color-surface) text-sm text-(--color-text) placeholder:text-(--color-text-faint) outline-none focus:border-(--color-accent)"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={18} className="text-(--color-text-faint)" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-(--color-border) bg-(--color-surface) text-sm text-(--color-text) outline-none focus:border-(--color-accent)"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="TRIAL">Trial Only</option>
            <option value="SUSPENDED">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Gym Tenants Table */}
      <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-(--color-border) bg-white/5 text-xs text-(--color-text-muted) uppercase">
                <th className="p-4 font-semibold">Gym Name</th>
                <th className="p-4 font-semibold">Owner Info</th>
                <th className="p-4 font-semibold">Plan</th>
                <th className="p-4 font-semibold">Branches</th>
                <th className="p-4 font-semibold">Members</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--color-border)">
              {filteredGyms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-(--color-text-muted)">
                    No gym tenants found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredGyms.map((gym) => (
                  <tr key={gym.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <p className="font-semibold text-(--color-text)">{gym.name}</p>
                      <p className="text-xs text-(--color-text-faint)">ID: {gym.id}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-(--color-text)">{gym.ownerName}</p>
                      <p className="text-xs text-(--color-text-muted)">{gym.ownerEmail} • {gym.ownerPhone}</p>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                          gym.subscriptionPlan === "ENTERPRISE"
                            ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                            : gym.subscriptionPlan === "PRO"
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {gym.subscriptionPlan}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-(--color-text)">{gym.branchesCount}</td>
                    <td className="p-4 font-medium text-(--color-text)">{gym.totalMembers}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${
                          gym.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : gym.status === "TRIAL"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        {gym.status === "ACTIVE" && <CheckCircle2 size={12} />}
                        {gym.status === "SUSPENDED" && <XCircle size={12} />}
                        {gym.status === "TRIAL" && <AlertCircle size={12} />}
                        {gym.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => toggleGymStatus(gym.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          gym.status === "ACTIVE"
                            ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                            : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        }`}
                      >
                        {gym.status === "ACTIVE" ? "Suspend Gym" : "Activate Gym"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboard Gym Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-(--color-border) bg-(--color-surface) p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-(--color-border) pb-4">
              <h2 className="text-lg font-bold text-(--color-text) flex items-center gap-2">
                <ShieldCheck className="text-(--color-accent)" size={20} /> Onboard New Gym Tenant
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-(--color-text-faint) hover:text-(--color-text)">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGym} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-(--color-text-muted) mb-1">Gym Name</label>
                <input
                  type="text"
                  placeholder="e.g. FitPulse Arena"
                  value={values.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  onBlur={() => handleBlur("name")}
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-(--color-surface) text-sm text-(--color-text) outline-none focus:border-(--color-accent) ${
                    touched.name && errors.name ? "border-rose-500" : "border-(--color-border)"
                  }`}
                />
                {touched.name && errors.name && <p className="text-xs text-rose-400 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-(--color-text-muted) mb-1">Owner Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={values.ownerName}
                  onChange={(e) => handleChange("ownerName", e.target.value)}
                  onBlur={() => handleBlur("ownerName")}
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-(--color-surface) text-sm text-(--color-text) outline-none focus:border-(--color-accent) ${
                    touched.ownerName && errors.ownerName ? "border-rose-500" : "border-(--color-border)"
                  }`}
                />
                {touched.ownerName && errors.ownerName && <p className="text-xs text-rose-400 mt-1">{errors.ownerName}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-(--color-text-muted) mb-1">Owner Email</label>
                  <input
                    type="email"
                    placeholder="owner@gym.com"
                    value={values.ownerEmail}
                    onChange={(e) => handleChange("ownerEmail", e.target.value)}
                    onBlur={() => handleBlur("ownerEmail")}
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-(--color-surface) text-sm text-(--color-text) outline-none focus:border-(--color-accent) ${
                      touched.ownerEmail && errors.ownerEmail ? "border-rose-500" : "border-(--color-border)"
                    }`}
                  />
                  {touched.ownerEmail && errors.ownerEmail && <p className="text-xs text-rose-400 mt-1">{errors.ownerEmail}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-(--color-text-muted) mb-1">Owner Phone</label>
                  <input
                    type="text"
                    placeholder="9876543210"
                    value={values.ownerPhone}
                    onChange={(e) => handleChange("ownerPhone", e.target.value)}
                    onBlur={() => handleBlur("ownerPhone")}
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-(--color-surface) text-sm text-(--color-text) outline-none focus:border-(--color-accent) ${
                      touched.ownerPhone && errors.ownerPhone ? "border-rose-500" : "border-(--color-border)"
                    }`}
                  />
                  {touched.ownerPhone && errors.ownerPhone && <p className="text-xs text-rose-400 mt-1">{errors.ownerPhone}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-(--color-text-muted) mb-1">SaaS Subscription Tier</label>
                <select
                  value={values.subscriptionPlan}
                  onChange={(e) => handleChange("subscriptionPlan", e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-(--color-border) bg-(--color-surface) text-sm text-(--color-text) outline-none focus:border-(--color-accent)"
                >
                  <option value="STARTER">Starter Tier (1 Branch)</option>
                  <option value="PRO">Pro Tier (Up to 5 Branches)</option>
                  <option value="ENTERPRISE">Enterprise Tier (Unlimited)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-(--color-border)">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-(--color-text-muted) hover:text-(--color-text)"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-(--color-accent) text-white font-semibold text-sm rounded-xl hover:bg-(--color-accent-strong) shadow-md"
                >
                  Create Gym Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
