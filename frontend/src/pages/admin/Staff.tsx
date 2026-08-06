import { useState, useEffect } from "react";
import { UserCheck, Search, Mail, Phone, Loader2, GitBranch } from "lucide-react";
import { gymApi, staffApi } from "@/lib/endpoints";
import { toast } from "sonner";
import CustomSelect from "@/components/ui/CustomSelect";

export default function Staff() {
  const [gyms, setGyms] = useState<any[]>([]);
  const [selectedGymId, setSelectedGymId] = useState<string>("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [staff, setStaff] = useState<any[]>([]);
  
  const [loadingGyms, setLoadingGyms] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(false);
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
          fetchStaff(gId, bId);
        }
      }
    } catch {
      toast.error("Failed to load gym tenants list from database.");
    } finally {
      setLoadingGyms(false);
    }
  };

  const fetchStaff = async (gymId: string, branchId: string) => {
    if (!gymId || !branchId) {
      setStaff([]);
      return;
    }
    setLoadingStaff(true);
    try {
      const res = await staffApi.list(gymId, branchId);
      const list = Array.isArray(res) ? res : res?.staff || [];
      setStaff(list);
    } catch {
      setStaff([]);
    } finally {
      setLoadingStaff(false);
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
      fetchStaff(gymId, firstBranchId);
    } else {
      setSelectedBranchId("");
      setStaff([]);
    }
  };

  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId);
    fetchStaff(selectedGymId, branchId);
  };

  const activeGym = gyms.find((g) => (g._id || g.id) === selectedGymId);
  const branchesList = activeGym?.branches || [];
  const activeBranch = branchesList.find((b: any) => (b._id || b.id) === selectedBranchId);

  const filteredStaff = staff.filter((s) => {
    const fullName = s.userId?.fullName || "";
    const email = s.userId?.email || "";
    
    return (
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-(--color-text) flex items-center gap-2">
          <UserCheck className="text-(--color-accent)" size={26} /> Reception & Branch Staff Roster
        </h1>
        <p className="text-sm text-(--color-text-muted)">
          View front-desk managers, kiosk operators, and branch staff accounts across all tenants.
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-(--color-text-faint) mb-1.5">Search Staff</label>
              <div className="relative">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-text-faint)" />
                <input
                  type="text"
                  placeholder="Search staff by name or email..."
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

      {/* Staff Table */}
      <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {loadingStaff ? (
            <div className="p-12 text-center text-sm text-(--color-text-muted) flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-(--color-accent)" /> Loading staff directory...
            </div>
          ) : !selectedBranchId ? (
            <div className="p-12 text-center border border-(--color-border) rounded-2xl text-(--color-text-muted) flex flex-col items-center justify-center gap-2">
              <GitBranch className="h-10 w-10 text-(--color-text-faint) mb-2" />
              <p>Please select a Gym Tenant and Branch Location above to query the staff roster.</p>
            </div>
          ) : (
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
                  filteredStaff.map((item) => {
                    const sId = item._id || item.id;
                    const name = item.userId?.fullName || "—";
                    const email = item.userId?.email || "—";
                    const phone = item.userId?.phone || "—";
                    const isActive = item.userId?.isActive ?? true;
                    const role = item.role || "BRANCH_MANAGER";

                    return (
                      <tr key={sId} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-semibold text-(--color-text)">{name}</td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400">
                            {role.replace("_", " ")}
                          </span>
                        </td>
                        <td className="p-4 font-medium text-(--color-accent-text)">
                          {activeGym?.name || "—"}
                        </td>
                        <td className="p-4 text-(--color-text-muted)">
                          {activeBranch?.name || "—"}
                        </td>
                        <td className="p-4 text-xs text-(--color-text-muted) space-y-0.5">
                          <p className="flex items-center gap-1.5 text-(--color-text)">
                            <Mail size={12} className="text-(--color-text-faint)" /> {email}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <Phone size={12} className="text-(--color-text-faint)" /> {phone}
                          </p>
                        </td>
                        <td className="p-4 text-right">
                          <span
                            className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                              isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                            }`}
                          >
                            {isActive ? "ACTIVE" : "INACTIVE"}
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
