import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { gymApi } from "@/lib/endpoints";

const DEFAULT_GYM_ID = "65a000000000000000000001";
const DEFAULT_BRANCH_ID = "65a000000000000000000002";

export function useGymBranch() {
  const user = useAuthStore((s) => s.user);
  const rawGymId = (user?.gymId as string | undefined) ?? null;
  const rawBranchId = (user?.branchId as string | undefined) ?? null;

  const [gymId, setGymId] = useState<string>(rawGymId || DEFAULT_GYM_ID);
  const [branchId, setBranchId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem("gymai.selected_branch_id");
      if (stored) return stored;
    } catch {}
    return rawBranchId || DEFAULT_BRANCH_ID;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolveBranch = () => {
    const activeGymId = rawGymId || DEFAULT_GYM_ID;
    setGymId(activeGymId);

    try {
      const stored = localStorage.getItem("gymai.selected_branch_id");
      if (stored) {
        setBranchId(stored);
        setLoading(false);
        return;
      }
    } catch {}

    if (rawBranchId) {
      setBranchId(rawBranchId);
      setLoading(false);
      return;
    }

    setLoading(true);
    gymApi
      .listBranches(activeGymId)
      .then((res) => {
        const branches = res?.branches || (Array.isArray(res as any) ? (res as any) : []);
        const firstBranch = branches[0]?._id || branches[0]?.id || DEFAULT_BRANCH_ID;
        setBranchId(firstBranch);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load branch");
        setBranchId(DEFAULT_BRANCH_ID);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    resolveBranch();

    const handleBranchChange = () => resolveBranch();
    window.addEventListener("gymai-branch-changed", handleBranchChange);
    window.addEventListener("storage", handleBranchChange);
    return () => {
      window.removeEventListener("gymai-branch-changed", handleBranchChange);
      window.removeEventListener("storage", handleBranchChange);
    };
  }, [rawGymId, rawBranchId]);

  return {
    gymId: gymId || DEFAULT_GYM_ID,
    branchId: branchId || DEFAULT_BRANCH_ID,
    loading,
    error,
  };
}
