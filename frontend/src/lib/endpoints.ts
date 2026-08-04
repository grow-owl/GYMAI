// Typed service functions grouped by backend module.
// Each function maps 1:1 to a real route in backend/src/modules/**/*.routes.ts.
import { api } from "./api";

export type Role = "SUPER_ADMIN" | "GYM_OWNER" | "BRANCH_MANAGER" | "TRAINER" | "MEMBER" | "KIOSK";

export interface AuthUser {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  gymId?: string;
  branchId?: string;
  isActive: boolean;
  createdAt: string;
  [key: string]: unknown;
}

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export const authApi = {
  register: (input: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role: "GYM_OWNER" | "MEMBER";
    ownerInviteCode?: string;
  }) => api.post<AuthResponse>("/auth/register", input),

  login: (email: string, password: string) => api.post<AuthResponse>("/auth/login", { email, password }),

  logout: () => api.post<null>("/auth/logout"),

  getMe: () => api.get<{ user: AuthUser }>("/auth/me"),
};

export const gymApi = {
  createGym: (input: { name: string; billingEmail: string }) =>
    api.post<{ gym: { _id: string } }>("/gyms", input),

  createBranch: (
    gymId: string,
    input: {
      name: string;
      address: { line1: string; city: string; state: string; pincode: string; country: string };
      contactPhone: string;
      timezone?: string;
    }
  ) => api.post<{ branch: { _id: string } }>(`/gyms/${gymId}/branches`, input),

  listBranches: (gymId: string) => api.get<{ branches: { _id: string; name: string }[] }>(`/gyms/${gymId}/branches`),

  getGymById: (gymId: string) => api.get<{ gym: unknown }>(`/gyms/${gymId}`),
};

export interface DashboardOverview {
  totalActiveMembers: number;
  totalTrainers: number;
  todayCheckIns: number;
  revenueThisMonth: number;
  membershipsExpiringIn7Days: number;
  avgAttendanceRate30d: number;
}

export const reportApi = {
  // Backend sends the overview object directly (not wrapped in { overview }).
  getOverview: (gymId: string, branchId?: string) =>
    api.get<DashboardOverview>(`/gyms/${gymId}/dashboard/overview${branchId ? `?branchId=${branchId}` : ""}`),

  listReports: (gymId: string) => api.get<{ reports: unknown[] }>(`/gyms/${gymId}/reports`),

  requestReport: (
    gymId: string,
    input: { reportType: string; scope: string; periodStart: string; periodEnd: string; format: string }
  ) => api.post<{ reportRequest: unknown }>(`/gyms/${gymId}/reports`, input),
};

export const trainerApi = {
  list: (gymId: string, branchId: string) =>
    api.get<{ trainers: unknown[] }>(`/gyms/${gymId}/branches/${branchId}/trainers`),
};

export const memberApi = {
  list: (gymId: string, branchId: string) =>
    api.get<{ members: unknown[] }>(`/gyms/${gymId}/branches/${branchId}/members`),
};

export const leadApi = {
  // Backend sends the leads array directly (not wrapped in { leads }).
  list: (gymId: string, branchId: string) => api.get<unknown[]>(`/gyms/${gymId}/branches/${branchId}/leads`),
};