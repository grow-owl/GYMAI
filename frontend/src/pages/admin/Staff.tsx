import { useState } from "react";
import { UserCheck, Search, Mail, Phone } from "lucide-react";
import { useAdminStore } from "@/store/adminStore";

export default function Staff() {
  const { users, gyms } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGym, setSelectedGym] = useState("ALL");

  const staffList = users.filter((u) => u.role === "BRANCH_MANAGER" || u.role === "KIOSK");

  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGym = selectedGym === "ALL" || s.gymName === selectedGym;
    return matchesSearch && matchesGym;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--color-text) flex items-center gap-2">
          <UserCheck className="text-(--color-accent)" size={26} /> Reception & Branch Staff Roster
        </h1>
        <p className="text-sm text-(--color-text-muted)">
          View front-desk managers, kiosk operators, and branch staff accounts across all tenants.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-text-faint)" />
          <input
            type="text"
            placeholder="Search staff by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-(--color-border) bg-(--color-surface) text-sm text-(--color-text) placeholder:text-(--color-text-faint) outline-none focus:border-(--color-accent)"
          />
        </div>

        <select
          value={selectedGym}
          onChange={(e) => setSelectedGym(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-(--color-border) bg-(--color-surface) text-sm text-(--color-text) outline-none focus:border-(--color-accent)"
        >
          <option value="ALL">All Gym Tenants</option>
          {gyms.map((g) => (
            <option key={g.id} value={g.name}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-(--color-border) bg-white/5 text-xs text-(--color-text-muted) uppercase">
              <th className="p-4 font-semibold">Staff Name</th>
              <th className="p-4 font-semibold">Role</th>
              <th className="p-4 font-semibold">Gym Tenant</th>
              <th className="p-4 font-semibold">Branch Location</th>
              <th className="p-4 font-semibold">Contact Info</th>
              <th className="p-4 font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--color-border)">
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-(--color-text-muted)">
                  No branch staff found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredStaff.map((staff) => (
                <tr key={staff.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-semibold text-(--color-text)">{staff.fullName}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400">
                      {staff.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-(--color-accent-text)">{staff.gymName}</td>
                  <td className="p-4 text-(--color-text-muted)">{staff.branchName || "Main Branch"}</td>
                  <td className="p-4 text-xs text-(--color-text-muted) space-y-0.5">
                    <p className="flex items-center gap-1.5 text-(--color-text)">
                      <Mail size={12} className="text-(--color-text-faint)" /> {staff.email}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Phone size={12} className="text-(--color-text-faint)" /> {staff.phone}
                    </p>
                  </td>
                  <td className="p-4 text-right">
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400">
                      {staff.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
