import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { gymApi } from "@/lib/endpoints";

/**
 * Resolves the current owner's gymId (from their auth profile) and their
 * first branch (most gym-owner-facing list endpoints are branch-scoped).
 * Every list page (members, trainers, leads, ...) needs this same pair,
 * so it lives in one hook instead of being re-fetched per page.
 */
export function useGymBranch() {
  const { user } = useAuth();
  const gymId = (user?.gymId as string | undefined) ?? null;
  const [branchId, setBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gymId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    gymApi
      .listBranches(gymId)
      .then((res) => setBranchId(res.branches[0]?._id ?? null))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load branch"))
      .finally(() => setLoading(false));
  }, [gymId]);

  return { gymId, branchId, loading, error };
}
