import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  register: (input: RegisterInput) => Promise<AuthUser>;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // On first load, if we have a saved access token, validate it against /auth/me
  // so a page refresh doesn't log the user out. If it's expired, api.ts's own
  // refresh-token flow (via the httpOnly cookie) will transparently retry.
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .getMe()
      .then((res) => setUser(res.user))
      .catch(() => setAccessToken(null))
      .finally(() => setLoading(false));
  }, []);

  const register = async (input: RegisterInput) => {
    setLoading(true);
    setError(null);
    try {
      const normalizedEmail = input.email.trim().toLowerCase();

      const { user: newUser, accessToken } = await authApi.register({
        fullName: input.fullName,
        email: normalizedEmail,
        phone: input.phone,
        password: input.password,
        role: "GYM_OWNER",
      });
      setAccessToken(accessToken);
      setUser(newUser);

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
      const message = e instanceof ApiError ? e.message : "Registration failed";
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { user: loggedInUser, accessToken } = await authApi.login(email, password);
      setAccessToken(accessToken);
      setUser(loggedInUser);
      return loggedInUser;
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Login failed";
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authApi.logout().catch(() => {
      // Even if the network call fails, clear the local session.
    });
    setAccessToken(null);
    setUser(null);
  };

  const clearError = () => setError(null);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, loading, error, register, login, logout, clearError }),
    [user, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
