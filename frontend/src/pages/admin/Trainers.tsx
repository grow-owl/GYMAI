import { useState } from "react";
import { Dumbbell, Search, Mail, Phone } from "lucide-react";
import { useAdminStore } from "@/store/adminStore";

export default function Trainers() {
  const { users, gyms } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGym, setSelectedGym] = useState("ALL");

  const trainers = users.filter((u) => u.role === "TRAINER");

  const filteredTrainers = trainers.filter((t) => {
    const matchesSearch =
      t.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGym = selectedGym === "ALL" || t.gymName === selectedGym;
    return matchesSearch && matchesGym;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-(--color-text) flex items-center gap-2">
          <Dumbbell className="text-(--color-accent)" size={26} /> Platform Trainers Directory
        </h1>
        <p className="text-sm text-(--color-text-muted)">
          Global roster of personal trainers and fitness coaches assigned across gym tenants.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-text-faint)" />
          <input
            type="text"
            placeholder="Search trainer by name or email..."
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

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTrainers.length === 0 ? (
          <div className="col-span-full p-8 text-center border border-(--color-border) rounded-2xl text-(--color-text-muted)">
            No trainers registered for the selected filters.
          </div>
        ) : (
          filteredTrainers.map((trainer) => (
            <div
              key={trainer.id}
              className="p-5 rounded-2xl border border-(--color-border) bg-(--color-surface) space-y-3 shadow-sm hover:border-(--color-accent)/40 transition-all"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-(--color-text)">{trainer.fullName}</h3>
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400">
                  {trainer.status}
                </span>
              </div>

              <p className="text-xs font-medium text-(--color-accent-text)">
                {trainer.gymName} • {trainer.branchName || "Main Branch"}
              </p>

              <div className="space-y-1 text-xs text-(--color-text-muted)">
                <p className="flex items-center gap-1.5">
                  <Mail size={13} className="text-(--color-text-faint)" /> {trainer.email}
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone size={13} className="text-(--color-text-faint)" /> {trainer.phone}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
