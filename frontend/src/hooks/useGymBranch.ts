import { useEffect, useState } from "react";
import { useAuth } from "@/store/authStore";
import { gymApi } from "@/lib/endpoints";

const DEFAULT_GYM_ID = "65a000000000000000000001";
const DEFAULT_BRANCH_ID = "65a000000000000000000002";

/**
 * Resolves the current owner's gymId (from their auth profile) and their
 * first branch (most gym-owner-facing list endpoints are branch-scoped).
 * Every list page (members, trainers, leads, ...) needs this same pair,
 * so it lives in one hook instead of being re-fetched per page.
 */
export function useGymBranch() {
  const { user } = useAuth();
  const rawGymId = (user?.gymId as string | undefined) ?? null;
  const rawBranchId = (user?.branchId as string | undefined) ?? null;

  const [gymId, setGymId] = useState<string>(rawGymId || DEFAULT_GYM_ID);
  const [branchId, setBranchId] = useState<string>(rawBranchId || DEFAULT_BRANCH_ID);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const activeGymId = rawGymId || DEFAULT_GYM_ID;
    setGymId(activeGymId);

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
  }, [rawGymId, rawBranchId]);

  return {
    gymId: gymId || DEFAULT_GYM_ID,
    branchId: branchId || DEFAULT_BRANCH_ID,
    loading,
    error,
  };
}
