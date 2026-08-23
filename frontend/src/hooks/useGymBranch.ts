import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { gymApi } from "@/lib/endpoints";

function extractId(val: any): string | null {
  if (!val) return null;
  if (typeof val === "string") return val;
  if (typeof val === "object" && val._id) return String(val._id);
  if (typeof val === "object" && val.id) return String(val.id);
  return null;
}

function isValidMongoId(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^[0-9a-fA-F]{24}$/.test(id);
}

let branchesCache: { [gymId: string]: { data: any[]; timestamp: number } } = {};
const CACHE_TTL_MS = 60000; // 1 minute in-memory cache

export function invalidateBranchesCache(gymId?: string) {
  if (gymId) {
    delete branchesCache[gymId];
  } else {
    branchesCache = {};
  }
}

async function fetchGymBranchesCached(gymId: string): Promise<any[]> {
  const cached = branchesCache[gymId];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const res = await gymApi.listBranches(gymId);
  const branches = res?.branches || (Array.isArray(res as any) ? (res as any) : []);
  branchesCache[gymId] = { data: branches, timestamp: Date.now() };
  return branches;
}

export function useGymBranch() {
  const user = useAuthStore((s) => s.user);
  const rawGymId = extractId(user?.gymId) || "";
  const rawBranchId = extractId(user?.branchId) || "";

  const [gymId, setGymId] = useState<string>(rawGymId);
  const storageKey = user?._id ? `gymai.selected_branch_id.${user._id}` : "gymai.selected_branch_id";
  const [branchId, setBranchId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && isValidMongoId(stored)) return stored;
    } catch {}
    return rawBranchId;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveBranch = useCallback(async () => {
    const activeGymId = extractId(user?.gymId) || "";
    const activeBranchId = extractId(user?.branchId) || "";
    setGymId(activeGymId);

    if (!activeGymId) {
      setBranchId("");
      setLoading(false);
      return;
    }

    let storedBranchId: string | null = null;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && isValidMongoId(stored)) {
        storedBranchId = stored;
      }
    } catch {}

    // If no custom stored branch and user has active branch already, use it directly
    if (!storedBranchId && isValidMongoId(activeBranchId)) {
      setBranchId(activeBranchId);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const branches = await fetchGymBranchesCached(activeGymId);
      if (storedBranchId) {
        const exists = branches.some((b: any) => (b._id || b.id) === storedBranchId);
        if (exists) {
          setBranchId(storedBranchId);
          setLoading(false);
          return;
        }
        localStorage.removeItem(storageKey);
      }

      if (isValidMongoId(activeBranchId)) {
        setBranchId(activeBranchId);
      } else {
        const firstBranch = branches.find((b: any) => isValidMongoId(b._id || b.id));
        setBranchId(firstBranch ? firstBranch._id || firstBranch.id : "");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load branch");
      setBranchId(activeBranchId || "");
    } finally {
      setLoading(false);
    }
  }, [user, storageKey]);

  useEffect(() => {
    resolveBranch();

    const handleBranchChange = () => resolveBranch();
    window.addEventListener("gymai-branch-changed", handleBranchChange);
    window.addEventListener("storage", handleBranchChange);
    return () => {
      window.removeEventListener("gymai-branch-changed", handleBranchChange);
      window.removeEventListener("storage", handleBranchChange);
    };
  }, [resolveBranch]);

  return {
    gymId,
    branchId,
    loading,
    error,
    refresh: resolveBranch,
  };
}
