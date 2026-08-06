import { useState } from "react";
import { Users, Search, Filter, Mail, Phone, Calendar } from "lucide-react";
import { useAdminStore } from "@/store/adminStore";

export default function Members() {
  const { users, gyms } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGym, setSelectedGym] = useState("ALL");

  const members = users.filter((u) => u.role === "MEMBER");

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone.includes(searchQuery);
    const matchesGym = selectedGym === "ALL" || m.gymName === selectedGym;
    return matchesSearch && matchesGym;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-(--color-text) flex items-center gap-2">
          <Users className="text-(--color-accent)" size={26} /> Platform Members Directory
        </h1>
        <p className="text-sm text-(--color-text-muted)">
          Global view of active members registered across all gym tenants on the SaaS platform.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-text-faint)" />
          <input
            type="text"
            placeholder="Search member by name, email or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-(--color-border) bg-(--color-surface) text-sm text-(--color-text) placeholder:text-(--color-text-faint) outline-none focus:border-(--color-accent)"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={18} className="text-(--color-text-faint)" />
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
      </div>

      {/* Members Table */}
      <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-(--color-border) bg-white/5 text-xs text-(--color-text-muted) uppercase">
                <th className="p-4 font-semibold">Member Name</th>
                <th className="p-4 font-semibold">Contact Info</th>
                <th className="p-4 font-semibold">Gym Tenant</th>
                <th className="p-4 font-semibold">Branch Location</th>
                <th className="p-4 font-semibold">Joined Date</th>
                <th className="p-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--color-border)">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-(--color-text-muted)">
                    No members found matching your search.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-(--color-text)">{m.fullName}</td>
                    <td className="p-4 space-y-0.5">
                      <p className="text-xs text-(--color-text) flex items-center gap-1.5">
                        <Mail size={12} className="text-(--color-text-faint)" /> {m.email}
                      </p>
                      <p className="text-xs text-(--color-text-muted) flex items-center gap-1.5">
                        <Phone size={12} className="text-(--color-text-faint)" /> {m.phone}
                      </p>
                    </td>
                    <td className="p-4 font-medium text-(--color-accent-text)">{m.gymName}</td>
                    <td className="p-4 text-(--color-text-muted)">{m.branchName || "Main Branch"}</td>
                    <td className="p-4 text-xs text-(--color-text-muted) flex items-center gap-1">
                      <Calendar size={12} className="text-(--color-text-faint)" /> {m.createdAt}
                    </td>
                    <td className="p-4 text-right">
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400">
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
