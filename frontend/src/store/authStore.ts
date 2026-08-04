import { create } from "zustand";
import { authApi, gymApi, type AuthUser } from "@/lib/endpoints";
import { getAccessToken, setAccessToken, ApiError } from "@/lib/api";

export interface OwnerAddress {
  line1: string;
  city: string;
  state: string;
  pincode: string;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  gymName?: string;
  address: OwnerAddress;
  avatarDataUrl?: string;
  ownerInviteCode: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True while the initial token check (on app load) or a login/register/logout call is in flight. */
  loading: boolean;
  /** True only for the very first "do we already have a session" check on app load. */
  initializing: boolean;
  error: string | null;
  /** Per-field validation errors returned by the backend, e.g. { phone: "..." }. */
  fieldErrors: Record<string, string>;
  init: () => Promise<void>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  clearError: () => void;
}

// Maps a logged-in user's role to the dashboard section they own.
export const roleHome: Record<string, string> = {
  GYM_OWNER: "/owner",
  SUPER_ADMIN: "/owner",
  BRANCH_MANAGER: "/owner",
  TRAINER: "/trainer",
  MEMBER: "/member",
  KIOSK: "/reception",
};

/** Pulls out a friendly message + per-field errors from a validation ApiError. */
function describeApiError(e: unknown, fallback: string): { message: string; fieldErrors: Record<string, string> } {
  if (e instanceof ApiError) {
    const details = e.details;
    if (Array.isArray(details) && details.length > 0) {
      const fieldErrors: Record<string, string> = {};
      for (const d of details) {
        if (d && typeof d === "object" && "field" in d && "message" in d) {
          const field = String((d as { field: unknown }).field);
          const message = String((d as { message: unknown }).message);
          if (field) fieldErrors[field] = message;
        }
      }
      const message = details
        .map((d) => (d && typeof d === "object" && "message" in d ? String((d as { message: unknown }).message) : null))
        .filter(Boolean)
        .join(" ");
      return { message: message || e.message, fieldErrors };
    }
    return { message: e.message, fieldErrors: {} };
  }
  return { message: fallback, fieldErrors: {} };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  loading: true,
  initializing: true,
  error: null,
  fieldErrors: {},

  init: async () => {
    const token = getAccessToken();
    if (!token) {
      set({ loading: false, initializing: false });
      return;
    }
    try {
      const res = await authApi.getMe();
      set({ user: res.user, isAuthenticated: true });
    } catch {
      setAccessToken(null);
    } finally {
      set({ loading: false, initializing: false });
    }
  },

  register: async (input) => {
    set({ loading: true, error: null, fieldErrors: {} });
    try {
      const normalizedEmail = input.email.trim().toLowerCase();

      const { user: newUser, accessToken } = await authApi.register({
        fullName: input.fullName,
        email: normalizedEmail,
        phone: input.phone,
        password: input.password,
        role: "GYM_OWNER",
        ownerInviteCode: input.ownerInviteCode,
      });
      setAccessToken(accessToken);
      set({ user: newUser, isAuthenticated: true });

      // Gym owners need a gym (+ a first branch) to use the rest of the app.
      // This mirrors the real onboarding flow: register -> create gym -> create branch.
      if (input.gymName) {
        try {
          const { gym } = await gymApi.createGym({ name: input.gymName, billingEmail: normalizedEmail });
          await gymApi.createBranch(gym._id, {
            name: "Main Branch",
            address: { ...input.address, country: "India" },
            contactPhone: input.phone,
          });
        } catch {
          // Gym/branch creation failing shouldn't block the account from being created —
          // the owner can finish setup from Settings.
        }
      }
      return newUser;
    } catch (e) {
      const { message, fieldErrors } = describeApiError(e, "Registration failed. Please check your details and try again.");
      set({ error: message, fieldErrors });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null, fieldErrors: {} });
    try {
      const { user: loggedInUser, accessToken } = await authApi.login(email, password);
      setAccessToken(accessToken);
      set({ user: loggedInUser, isAuthenticated: true });
      return loggedInUser;
    } catch (e) {
      const { message, fieldErrors } = describeApiError(e, "Login failed. Please check your email and password.");
      set({ error: message, fieldErrors });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  logout: () => {
    authApi.logout().catch(() => {
      // Even if the network call fails, clear the local session.
    });
    setAccessToken(null);
    set({ user: null, isAuthenticated: false });
  },

  clearError: () => set({ error: null, fieldErrors: {} }),
}));

/** Back-compat hook so existing call sites (`useAuth()`) keep working after the Redux/Context -> Zustand migration. */
export function useAuth() {
  return useAuthStore();
}
