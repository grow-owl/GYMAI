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

  forgotPassword: (email: string) => api.post<{ message: string }>("/auth/forgot-password", { email }),

  updateProfile: (data: { fullName?: string; phone?: string; avatarUrl?: string }) =>
    api.patch<{ user: AuthUser }>("/auth/profile", data),
};

export const gymApi = {
  createGym: (input: { name: string; billingEmail: string }) =>
    api.post<{ gym: { _id: string; name: string } }>("/gyms", input),

  createBranch: (
    gymId: string,
    input: {
      name: string;
      address: { line1: string; city: string; state: string; pincode: string; country: string };
      contactPhone: string;
      timezone?: string;
    }
  ) => api.post<{ branch: { _id: string; name: string } }>(`/gyms/${gymId}/branches`, input),

  listBranches: (gymId: string) => api.get<{ branches: { _id: string; name: string }[] }>(`/gyms/${gymId}/branches`),

  getGymById: (gymId: string) => api.get<{ gym: any }>(`/gyms/${gymId}`),
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
  getOverview: (gymId: string, branchId?: string) =>
    api.get<DashboardOverview>(`/gyms/${gymId}/dashboard/overview${branchId ? `?branchId=${branchId}` : ""}`),

  listReports: (gymId: string) => api.get<{ reports: any[] }>(`/gyms/${gymId}/reports`),

  requestReport: (
    gymId: string,
    input: { reportType: string; scope: string; periodStart: string; periodEnd: string; format: string }
  ) => api.post<{ reportRequest: any }>(`/gyms/${gymId}/reports`, input),

  getBranchComparison: (gymId: string, metric?: string, period?: string) =>
    api.get<any>(`/gyms/${gymId}/analytics/branch-comparison?metric=${metric || "revenue"}&period=${period || "30d"}`),
};

export const trainerApi = {
  list: (gymId: string, branchId: string) =>
    api.get<{ trainers: any[] }>(`/gyms/${gymId}/branches/${branchId}/trainers`),

  create: (gymId: string, branchId: string, data: any) =>
    api.post<{ trainer: any }>(`/gyms/${gymId}/branches/${branchId}/trainers`, data),

  assignClient: (gymId: string, _branchId: string, _trainerId: string, memberId: string) =>
    api.patch<{ success: boolean }>(`/gyms/${gymId}/members/${memberId}/assign-trainer`, { trainerId: _trainerId }),

  getWorkload: (gymId: string, trainerId: string) =>
    api.get<{ activeMembersAssigned: number }>(`/gyms/${gymId}/trainers/${trainerId}/workload`),

  getMyClients: (gymId: string) =>
    api.get<{ clients: any[] }>(`/gyms/${gymId}/trainers/me/clients`),

  delete: (gymId: string, trainerId: string) =>
    api.delete<any>(`/gyms/${gymId}/trainers/${trainerId}`),
};

export const memberApi = {
  list: (gymId: string, branchId: string) =>
    api.get<{ members: any[] } | any[]>(`/gyms/${gymId}/branches/${branchId}/members`),

  create: (gymId: string, branchId: string, data: any) =>
    api.post<{ member: any }>(`/gyms/${gymId}/branches/${branchId}/members`, data),

  freeze: (gymId: string, _branchId: string, memberId: string, reason: string, startDate?: string, endDate?: string) =>
    api.patch<any>(`/gyms/${gymId}/members/${memberId}/freeze`, { freezeUntil: endDate || startDate, reason }),

  extend: (gymId: string, _branchId: string, memberId: string, days: number, reason: string) =>
    api.patch<any>(`/gyms/${gymId}/members/${memberId}/extend`, { days, reason }),

  cancel: (gymId: string, _branchId: string, memberId: string, reason: string) =>
    api.patch<any>(`/gyms/${gymId}/members/${memberId}/cancel`, { reason }),

  renew: (gymId: string, memberId: string, data: { newEndDate: string; planName?: string }) =>
    api.patch<any>(`/gyms/${gymId}/members/${memberId}/renew`, data),

  getSelfProfile: () => api.get<{ member: any }>("/members/me"),

  getMyReferralStats: () => api.get<any>("/members/me/referral-stats"),
};

export const attendanceApi = {
  checkIn: (gymId: string, branchId: string, identifier: string) =>
    api.post<{ checkIn: any }>("/attendance/check-in", { gymId, branchId, identifier }),

  checkOut: (attendanceId: string) => api.post<any>("/attendance/check-out", { attendanceId }),

  getToday: (gymId: string, branchId: string) =>
    api.get<{ attendance: any[] }>(`/gyms/${gymId}/branches/${branchId}/attendance/daily`),

  getCurrentSession: () => api.get<any>("/attendance/me/current"),

  getMyHistory: () => api.get<any[]>("/attendance/me/history"),

  getMyStats: () => api.get<any>("/attendance/me/stats"),
};

export const workoutApi = {
  listExercises: () => api.get<any[]>("/exercises"),

  createExercise: (data: any) => api.post<any>("/exercises", data),

  listPlans: () => api.get<any[]>("/workout-plans"),

  createPlan: (data: any) => api.post<any>("/workout-plans", data),

  logWorkout: (data: any) => api.post<any>("/workout-logs", data),
};

export const dietApi = {
  listPlans: () => api.get<any[]>("/diet-plans"),

  createPlan: (data: any) => api.post<any>("/diet-plans", data),

  getActive: () => api.get<any>("/diet-plans/active"),
};

export const progressApi = {
  getHistory: (memberId?: string) => api.get<any>(`/progress${memberId ? `?memberId=${memberId}` : ""}`),

  logWeight: (weightKg: number, notes?: string) => api.post<any>("/progress/weight", { weightKg, notes }),
};

export const gamificationApi = {
  getMyProfile: () => api.get<any>("/gamification/me"),

  getLeaderboard: (gymId?: string) => api.get<any>(`/gamification/leaderboard${gymId ? `?gymId=${gymId}` : ""}`),

  listChallenges: (gymId?: string) => api.get<any[]>(`/gamification/challenges${gymId ? `?gymId=${gymId}` : ""}`),

  joinChallenge: (challengeId: string) => api.post<any>(`/gamification/challenges/${challengeId}/join`),
};

export const paymentApi = {
  listMemberPayments: (gymId: string) => api.get<any>(`/gyms/${gymId}/payments`),

  recordMemberPayment: (gymId: string, data: any) => api.post<any>(`/gyms/${gymId}/payments/manual`, data),

  getRevenueSummary: (gymId: string) => api.get<any>(`/gyms/${gymId}/payments/revenue-summary`),

  getMyPayments: (gymId: string) => api.get<any>(`/gyms/${gymId}/payments/me`),

  getPlatformBilling: () => api.get<any>("/billing/platform/subscription"),

  upgradePlatformTier: (planId: string) => api.post<any>("/billing/platform/upgrade", { planId }),

  getPlatformAnalyticsOverview: () => api.get<any>("/billing/platform/analytics/overview"),

  recordManualPlatformPayment: (gymId: string, data: any) =>
    api.post<any>(`/billing/platform/gyms/${gymId}/manual-payment`, data),

  requestUpgrade: (gymId: string, data: { requestedPlan: string; billingCycle?: string; notes?: string }) =>
    api.post<any>(`/billing/platform/gyms/${gymId}/upgrade-request`, data),

  listUpgradeRequests: () => api.get<any>("/billing/platform/upgrade-requests"),
};

export const aiApi = {
  getWeeklyDigest: (gymId: string) => api.get<{ weeklyDigest: string }>(`/ai/gyms/${gymId}/insights/weekly-digest`),

  getAtRiskMembers: (gymId: string, riskLevel?: string) =>
    api.get<any>(`/ai/gyms/${gymId}/at-risk-members${riskLevel ? `?riskLevel=${riskLevel}` : ""}`),

  startConversation: (firstMessage: string) =>
    api.post<{ conversation: { _id: string; title: string }; replyMessage: { content: string } }>("/ai/chat/conversations", { firstMessage }),

  sendMessage: (conversationId: string, content: string) =>
    api.post<{ replyMessage: { content: string; role: string } }>(`/ai/chat/conversations/${conversationId}/messages`, { content }),

  getHistory: (conversationId: string) =>
    api.get<{ messages: { _id: string; role: string; content: string; createdAt: string }[] }>(`/ai/chat/conversations/${conversationId}/messages`),

  listConversations: () =>
    api.get<{ conversations: { _id: string; title: string; lastMessageAt: string }[] }>("/ai/chat/conversations"),

  getUpsellRecommendation: (memberId?: string) =>
    api.get<any>(`/ai/members/${memberId || "me"}/upsell-recommendation`),
};

export const productApi = {
  list: (gymId: string) => api.get<any[]>(`/gyms/${gymId}/products`),

  add: (gymId: string, data: any) => api.post<any>(`/gyms/${gymId}/products`, data),

  checkout: (productId: string, data: { quantity: number; memberId?: string; paymentMethod?: string; notes?: string }) =>
    api.post<any>(`/products/${productId}/purchase`, data),
};

export const expenseApi = {
  list: (gymId?: string) => api.get<any[]>(`/expenses${gymId ? `?gymId=${gymId}` : ""}`),

  add: (data: any) => api.post<any>("/expenses", data),
};

export const leadApi = {
  list: (gymId: string, branchId: string) => api.get<any[]>(`/gyms/${gymId}/branches/${branchId}/leads`),

  create: (gymId: string, branchId: string, data: any) => api.post<any>(`/gyms/${gymId}/branches/${branchId}/leads`, data),

  updateStatus: (_gymId: string, _branchId: string, leadId: string, status: string) =>
    api.patch<any>(`/leads/${leadId}/status`, { status }),
};

export const equipmentApi = {
  list: (gymId?: string) => api.get<any[]>(`/equipment${gymId ? `?gymId=${gymId}` : ""}`),

  add: (data: any) => api.post<any>("/equipment", data),

  updateStatus: (id: string, status: string) => api.patch<any>(`/equipment/${id}`, { status }),
};

export interface INotificationItem {
  _id: string;
  id?: string;
  title: string;
  body: string;
  type?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  data?: Record<string, string>;
}

export interface NotificationPaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export const notificationApi = {
  list: (params?: { page?: number; limit?: number; isRead?: boolean; type?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.isRead !== undefined) query.append("isRead", params.isRead.toString());
    if (params?.type) query.append("type", params.type);
    const qStr = query.toString();
    return api.get<{ notifications: INotificationItem[]; pagination?: NotificationPaginationMeta }>(
      `/notifications${qStr ? `?${qStr}` : ""}`
    );
  },

  getUnreadCount: () => api.get<{ unreadCount: number }>("/notifications/unread-count"),

  markAsRead: (notificationId: string) =>
    api.patch<{ notification: INotificationItem }>(`/notifications/${notificationId}/read`),

  markAllAsRead: () => api.patch<{ markedCount: number }>("/notifications/read-all"),

  broadcast: (gymId: string, data: { title: string; message: string; targetRole?: string }) =>
    api.post<any>(`/gyms/${gymId}/notifications/broadcast`, data),

  getWhatsAppLogs: (gymId?: string) =>
    api.get<any>(`/notifications/whatsapp-logs${gymId ? `?gymId=${gymId}` : ""}`),

  getWhatsAppLog: (gymId: string) => api.get<any>(`/gyms/${gymId}/whatsapp-log`),
};

export const privacyApi = {
  exportData: () => api.get<any>("/users/me/export-data"),
  requestDeletion: () => api.post<any>("/users/me/request-deletion"),
};

export const feedbackApi = {
  create: (memberId: string, data: { note: string; rating?: number; workoutLogId?: string }) =>
    api.post<any>(`/members/${memberId}/feedback`, { memberId, ...data }),

  submitFeedback: (memberId: string, data: { note: string; rating?: number; workoutLogId?: string }) =>
    api.post<any>(`/members/${memberId}/feedback`, { memberId, ...data }),

  list: (memberId: string) => api.get<any>(`/members/${memberId}/feedback`),

  listFeedback: (memberId: string) => api.get<any>(`/members/${memberId}/feedback`),
};