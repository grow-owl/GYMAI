import { useState, useEffect } from "react";
import { Users, Search, Mail, Phone, Calendar, Loader2, GitBranch } from "lucide-react";
import { gymApi, memberApi } from "@/lib/endpoints";
import { toast } from "sonner";
import CustomSelect from "@/components/ui/CustomSelect";

export default function Members() {
  const [gyms, setGyms] = useState<any[]>([]);
  const [selectedGymId, setSelectedGymId] = useState<string>("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [members, setMembers] = useState<any[]>([]);
  
  const [loadingGyms, setLoadingGyms] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchGyms = async () => {
    setLoadingGyms(true);
    try {
      const res = await gymApi.listAllGyms();
      const gymList = res.gyms || [];
      setGyms(gymList);
      
      if (gymList.length > 0) {
        const firstGym = gymList[0];
        const gId = firstGym._id || firstGym.id;
        setSelectedGymId(gId);
        
        if (firstGym.branches && firstGym.branches.length > 0) {
          const bId = firstGym.branches[0]._id || firstGym.branches[0].id;
          setSelectedBranchId(bId);
          fetchMembers(gId, bId);
        }
      }
    } catch {
      toast.error("Failed to load gym tenants list from database.");
    } finally {
      setLoadingGyms(false);
    }
  };

  const fetchMembers = async (gymId: string, branchId: string) => {
    if (!gymId || !branchId) {
      setMembers([]);
      return;
    }
    setLoadingMembers(true);
    try {
      const res = await memberApi.list(gymId, branchId);
      const list = Array.isArray(res) ? res : res?.members || [];
      setMembers(list);
    } catch {
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    fetchGyms();
  }, []);

  const handleGymChange = (gymId: string) => {
    setSelectedGymId(gymId);
    const targetGym = gyms.find((g) => (g._id || g.id) === gymId);
    
    if (targetGym && targetGym.branches && targetGym.branches.length > 0) {
      const firstBranchId = targetGym.branches[0]._id || targetGym.branches[0].id;
      setSelectedBranchId(firstBranchId);
      fetchMembers(gymId, firstBranchId);
    } else {
      setSelectedBranchId("");
      setMembers([]);
    }
  };

  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId);
    fetchMembers(selectedGymId, branchId);
  };

  const activeGym = gyms.find((g) => (g._id || g.id) === selectedGymId);
  const branchesList = activeGym?.branches || [];
  const activeBranch = branchesList.find((b: any) => (b._id || b.id) === selectedBranchId);

  const filteredMembers = members.filter((m) => {
    const fullName = m.userId?.fullName || "";
    const email = m.userId?.email || "";
    const phone = m.userId?.phone || "";
    
    return (
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery)
    );
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

      {/* Selectors and Controls */}
      <div className="space-y-4">
        {loadingGyms ? (
          <div className="flex items-center gap-2 text-sm text-(--color-text-muted)">
            <Loader2 className="w-4 h-4 animate-spin text-(--color-accent)" /> Loading organizations...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <CustomSelect
                label="GYM TENANT"
                value={selectedGymId}
                onChange={(val) => handleGymChange(val)}
                options={gyms.map((g) => ({
                  value: g._id || g.id,
                  label: g.name,
                }))}
              />
            </div>

            <div>
              <CustomSelect
                label="BRANCH LOCATION"
                value={selectedBranchId}
                onChange={(val) => handleBranchChange(val)}
                disabled={branchesList.length === 0}
                options={
                  branchesList.length === 0
                    ? [{ value: "", label: "No branches registered" }]
                    : branchesList.map((b: any) => ({
                        value: b._id || b.id,
                        label: b.name,
                      }))
                }
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-(--color-text-faint) mb-1.5">Search Members</label>
              <div className="relative">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-text-faint)" />
                <input
                  type="text"
                  placeholder="Search member by name, email or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={!selectedBranchId}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-(--color-border) bg-(--color-surface) text-sm text-(--color-text) placeholder:text-(--color-text-faint) outline-none focus:border-(--color-accent) disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Members Table */}
      <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {loadingMembers ? (
            <div className="p-12 text-center text-sm text-(--color-text-muted) flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-(--color-accent)" /> Loading members database...
            </div>
          ) : !selectedBranchId ? (
            <div className="p-12 text-center text-sm text-(--color-text-muted) flex flex-col items-center justify-center gap-2">
              <GitBranch className="h-10 w-10 text-(--color-text-faint) mb-2" />
              <p>Please select a Gym Tenant and Branch Location above to query the members directory.</p>
            </div>
          ) : (
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
                  filteredMembers.map((m) => {
                    const mId = m._id || m.id;
                    const name = m.userId?.fullName || "—";
                    const email = m.userId?.email || "—";
                    const phone = m.userId?.phone || "—";
                    const dateStr = m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "—";
                    const status = m.membershipStatus || "ACTIVE";

                    return (
                      <tr key={mId} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-semibold text-(--color-text)">{name}</td>
                        <td className="p-4 space-y-0.5">
                          <p className="text-xs text-(--color-text) flex items-center gap-1.5">
                            <Mail size={12} className="text-(--color-text-faint)" /> {email}
                          </p>
                          <p className="text-xs text-(--color-text-muted) flex items-center gap-1.5">
                            <Phone size={12} className="text-(--color-text-faint)" /> {phone}
                          </p>
                        </td>
                        <td className="p-4 font-medium text-(--color-accent-text)">
                          {activeGym?.name || "—"}
                        </td>
                        <td className="p-4 text-(--color-text-muted)">
                          {activeBranch?.name || "—"}
                        </td>
                        <td className="p-4 text-xs text-(--color-text-muted)">
                          <span className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-(--color-text-faint)" /> {dateStr}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span
                            className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                              status === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : status === "EXPIRED"
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-rose-500/10 text-rose-400"
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
