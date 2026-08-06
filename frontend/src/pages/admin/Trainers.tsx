import { useState, useEffect } from "react";
import { Dumbbell, Search, Mail, Phone, Loader2, GitBranch } from "lucide-react";
import { gymApi, trainerApi } from "@/lib/endpoints";
import { toast } from "sonner";
import CustomSelect from "@/components/ui/CustomSelect";

export default function Trainers() {
  const [gyms, setGyms] = useState<any[]>([]);
  const [selectedGymId, setSelectedGymId] = useState<string>("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [trainers, setTrainers] = useState<any[]>([]);
  
  const [loadingGyms, setLoadingGyms] = useState(true);
  const [loadingTrainers, setLoadingTrainers] = useState(false);
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
          fetchTrainers(gId, bId);
        }
      }
    } catch {
      toast.error("Failed to load gym tenants list from database.");
    } finally {
      setLoadingGyms(false);
    }
  };

  const fetchTrainers = async (gymId: string, branchId: string) => {
    if (!gymId || !branchId) {
      setTrainers([]);
      return;
    }
    setLoadingTrainers(true);
    try {
      const res = await trainerApi.list(gymId, branchId);
      const list = Array.isArray(res) ? res : res?.trainers || [];
      setTrainers(list);
    } catch {
      setTrainers([]);
    } finally {
      setLoadingTrainers(false);
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
      fetchTrainers(gymId, firstBranchId);
    } else {
      setSelectedBranchId("");
      setTrainers([]);
    }
  };

  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId);
    fetchTrainers(selectedGymId, branchId);
  };

  const activeGym = gyms.find((g) => (g._id || g.id) === selectedGymId);
  const branchesList = activeGym?.branches || [];
  const activeBranch = branchesList.find((b: any) => (b._id || b.id) === selectedBranchId);

  const filteredTrainers = trainers.filter((t) => {
    const fullName = t.userId?.fullName || "";
    const email = t.userId?.email || "";
    
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
          <Dumbbell className="text-(--color-accent)" size={26} /> Platform Trainers Directory
        </h1>
        <p className="text-sm text-(--color-text-muted)">
          Global roster of personal trainers and fitness coaches assigned across gym tenants.
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-(--color-text-faint) mb-1.5">Search Trainers</label>
              <div className="relative">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-text-faint)" />
                <input
                  type="text"
                  placeholder="Search trainer by name or email..."
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

      {/* Trainers Grid */}
      {loadingTrainers ? (
        <div className="p-12 text-center text-sm text-(--color-text-muted) flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-(--color-accent)" /> Loading trainers database...
        </div>
      ) : !selectedBranchId ? (
        <div className="p-12 text-center border border-(--color-border) rounded-2xl text-(--color-text-muted) flex flex-col items-center justify-center gap-2">
          <GitBranch className="h-10 w-10 text-(--color-text-faint) mb-2" />
          <p>Please select a Gym Tenant and Branch Location above to query the trainers roster.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTrainers.length === 0 ? (
            <div className="col-span-full p-8 text-center border border-(--color-border) rounded-2xl text-(--color-text-muted)">
              No trainers registered for the selected branch.
            </div>
          ) : (
            filteredTrainers.map((t) => {
              const tId = t._id || t.id;
              const name = t.userId?.fullName || "—";
              const email = t.userId?.email || "—";
              const phone = t.userId?.phone || "—";
              const isActive = t.userId?.isActive ?? true;

              return (
                <div
                  key={tId}
                  className="p-5 rounded-2xl border border-(--color-border) bg-(--color-surface) space-y-3 shadow-sm hover:border-(--color-accent)/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-(--color-text)">{name}</h3>
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                        isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                      }`}
                    >
                      {isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-(--color-accent-text)">
                    {activeGym?.name || "—"} • {activeBranch?.name || "—"}
                  </p>

                  <div className="space-y-1 text-xs text-(--color-text-muted)">
                    <p className="flex items-center gap-1.5">
                      <Mail size={13} className="text-(--color-text-faint)" /> {email}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Phone size={13} className="text-(--color-text-faint)" /> {phone}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
