import { useEffect, useState } from "react";
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

export function useGymBranch() {
  const user = useAuthStore((s) => s.user);
  const rawGymId = extractId(user?.gymId) || "";
  const rawBranchId = extractId(user?.branchId) || "";

  const [gymId, setGymId] = useState<string>(rawGymId);
  const [branchId, setBranchId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem("gymai.selected_branch_id");
      if (stored && isValidMongoId(stored)) return stored;
    } catch {}
    return rawBranchId;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveBranch = () => {
    const activeGymId = extractId(user?.gymId) || "";
    const activeBranchId = extractId(user?.branchId) || "";
    setGymId(activeGymId);

    try {
      const stored = localStorage.getItem("gymai.selected_branch_id");
      if (stored && isValidMongoId(stored)) {
        setBranchId(stored);
        setLoading(false);
        return;
      }
    } catch {}

    if (isValidMongoId(activeBranchId)) {
      setBranchId(activeBranchId);
      setLoading(false);
      return;
    }

    if (!activeGymId) {
      setBranchId("");
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
          setBranchId("");
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load branch");
        setBranchId("");
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
  }, [user]);

  return {
    gymId,
    branchId,
    loading,
    error,
  };
}
