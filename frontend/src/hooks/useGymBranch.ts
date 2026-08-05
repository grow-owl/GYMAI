import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { gymApi } from "@/lib/endpoints";

const DEFAULT_GYM_ID = "65a000000000000000000001";
const DEFAULT_BRANCH_ID = "65a000000000000000000002";

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

export function useGymBranch() {
  const user = useAuthStore((s) => s.user);
  const rawGymId = extractId(user?.gymId);
  const rawBranchId = extractId(user?.branchId);

  const initialGymId = isValidMongoId(rawGymId) ? rawGymId! : DEFAULT_GYM_ID;

  const [gymId, setGymId] = useState<string>(initialGymId);
  const [branchId, setBranchId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem("gymai.selected_branch_id");
      if (stored && isValidMongoId(stored)) return stored;
      if (stored) localStorage.removeItem("gymai.selected_branch_id");
    } catch {}
    return isValidMongoId(rawBranchId) ? rawBranchId! : DEFAULT_BRANCH_ID;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolveBranch = () => {
    const activeGymId = isValidMongoId(rawGymId) ? rawGymId! : DEFAULT_GYM_ID;
    setGymId(activeGymId);

    try {
      const stored = localStorage.getItem("gymai.selected_branch_id");
      if (stored && isValidMongoId(stored)) {
        setBranchId(stored);
        setLoading(false);
        return;
      }
      if (stored) {
        localStorage.removeItem("gymai.selected_branch_id");
      }
    } catch {}

    if (isValidMongoId(rawBranchId)) {
      setBranchId(rawBranchId!);
      setLoading(false);
      return;
    }

    setLoading(true);
    gymApi
      .listBranches(activeGymId)
      .then((res) => {
        const branches = res?.branches || (Array.isArray(res as any) ? (res as any) : []);
        const firstBranch = branches.find((b: any) => isValidMongoId(b._id || b.id));
        if (firstBranch) {
          setBranchId(firstBranch._id || firstBranch.id);
        } else {
          setBranchId(DEFAULT_BRANCH_ID);
        }
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
    gymId: isValidMongoId(gymId) ? gymId : DEFAULT_GYM_ID,
    branchId: isValidMongoId(branchId) ? branchId : DEFAULT_BRANCH_ID,
    loading,
    error,
  };
}
