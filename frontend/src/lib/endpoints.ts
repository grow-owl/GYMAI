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
  gymName?: string;
  branchName?: string;
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
    role?: "MEMBER";
    referralCode?: string;
  }) => api.post<AuthResponse>("/auth/register", input),

  registerOwner: (input: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    gymName: string;
    branchName?: string;
    plan?: string;
  }) => api.post<{ user: AuthUser; gym: any; primaryBranch: any }>("/auth/register-owner", input),

  adminResetPassword: (userId: string, newPassword: string) =>
    api.patch<{ message: string }>(`/auth/users/${userId}/reset-password`, { newPassword }),

  login: (email: string, password: string) => api.post<AuthResponse>("/auth/login", { email, password }),

  logout: () => api.post<null>("/auth/logout"),

  logoutAll: () => api.post<null>("/auth/logout-all"),

  getMe: () => api.get<{ user: AuthUser }>("/auth/me"),

  forgotPassword: (email: string) => api.post<{ message: string }>("/auth/forgot-password", { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post<{ message: string }>("/auth/reset-password", { token, newPassword }),

  updateProfile: (data: { fullName?: string; phone?: string; avatarUrl?: string }) =>
    api.patch<{ user: AuthUser }>("/auth/profile", data),

  changePassword: (data: { currentPassword?: string; newPassword: string }) =>
    api.patch<{ message: string }>("/auth/change-password", data),
};

export const gymApi = {
  listAllGyms: () => api.get<{ gyms: any[] }>("/gyms"),

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

  updateGym: (gymId: string, data: any) => api.patch<{ gym: any }>(`/gyms/${gymId}`, data),

  deleteGym: (gymId: string) => api.delete<any>(`/gyms/${gymId}`),

  updateGymPlan: (gymId: string, plan: string) => api.patch<any>(`/gyms/${gymId}/plan`, { plan }),

  getOverview: (gymId: string) => api.get<any>(`/gyms/${gymId}/overview`),

  getBranchById: (gymId: string, branchId: string) => api.get<any>(`/gyms/${gymId}/branches/${branchId}`),

  updateBranch: (gymId: string, branchId: string, data: any) =>
    api.patch<any>(`/gyms/${gymId}/branches/${branchId}`, data),

  deleteBranch: (gymId: string, branchId: string) => api.delete<any>(`/gyms/${gymId}/branches/${branchId}`),

  assignBranchManager: (gymId: string, branchId: string, managerId: string) =>
    api.patch<any>(`/gyms/${gymId}/branches/${branchId}/manager`, { managerId }),
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

  getExpiringMemberships: (gymId: string) =>
    api.get<{ expiringMemberships: any[] } | any[]>(`/gyms/${gymId}/dashboard/expiring-memberships`),

  listReports: (gymId: string) => api.get<{ reports: any[] }>(`/gyms/${gymId}/reports`),

  getReportById: (gymId: string, reportRequestId: string) =>
    api.get<any>(`/gyms/${gymId}/reports/${reportRequestId}`),

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

  getById: (gymId: string, trainerId: string) =>
    api.get<any>(`/gyms/${gymId}/trainers/${trainerId}`),

  create: (gymId: string, branchId: string, data: any) =>
    api.post<{ trainer: any }>(`/gyms/${gymId}/branches/${branchId}/trainers`, data),

  update: (gymId: string, trainerId: string, data: any) =>
    api.patch<any>(`/gyms/${gymId}/trainers/${trainerId}`, data),

  assignClient: (gymId: string, _branchId: string, _trainerId: string, memberId: string) =>
    api.patch<{ success: boolean }>(`/gyms/${gymId}/members/${memberId}/assign-trainer`, { trainerId: _trainerId }),

  getWorkload: (gymId: string, trainerId: string) =>
    api.get<{ activeMembersAssigned: number }>(`/gyms/${gymId}/trainers/${trainerId}/workload`),

  getMyClients: (gymId: string) =>
    api.get<{ clients: any[] }>(`/gyms/${gymId}/trainers/me/clients`),

  delete: (gymId: string, trainerId: string) =>
    api.delete<any>(`/gyms/${gymId}/trainers/${trainerId}`),
};

export const staffApi = {
  list: (gymId: string, branchId?: string) =>
    api.get<{ staff: any[] }>(branchId ? `/gyms/${gymId}/branches/${branchId}/staff` : `/gyms/${gymId}/staff`),

  create: (gymId: string, branchId?: string, data?: any) =>
    api.post<{ staff: any }>(branchId ? `/gyms/${gymId}/branches/${branchId}/staff` : `/gyms/${gymId}/staff`, data),

  delete: (gymId: string, branchId?: string, staffId?: string) => {
    const sId = staffId || branchId || "";
    const bId = staffId ? branchId : undefined;
    return api.delete<any>(bId ? `/gyms/${gymId}/branches/${bId}/staff/${sId}` : `/gyms/${gymId}/staff/${sId}`);
  },
};

export const memberApi = {
  list: (gymId: string, branchId?: string) =>
    api.get<{ members: any[] } | any[]>(branchId ? `/gyms/${gymId}/branches/${branchId}/members` : `/gyms/${gymId}/members`),

  create: (gymId: string, branchId?: string, data?: any) =>
    api.post<{ member: any }>(branchId ? `/gyms/${gymId}/branches/${branchId}/members` : `/gyms/${gymId}/members`, data),

  getMemberById: (gymId: string, memberId: string) =>
    api.get<any>(`/gyms/${gymId}/members/${memberId}`),

  updateMember: (gymId: string, memberId: string, data: any) =>
    api.patch<any>(`/gyms/${gymId}/members/${memberId}`, data),

  deleteMember: (gymId: string, memberId: string) =>
    api.delete<any>(`/gyms/${gymId}/members/${memberId}`),

  freeze: (gymId: string, _branchId: string, memberId: string, reason: string, startDate?: string, endDate?: string) =>
    api.patch<any>(`/gyms/${gymId}/members/${memberId}/freeze`, { freezeUntil: endDate || startDate, reason }),

  extend: (gymId: string, _branchId: string, memberId: string, days: number, reason: string) =>
    api.patch<any>(`/gyms/${gymId}/members/${memberId}/extend`, { days, reason }),

  cancel: (gymId: string, _branchId: string, memberId: string, reason: string) =>
    api.patch<any>(`/gyms/${gymId}/members/${memberId}/cancel`, { reason }),

  renew: (gymId: string, _branchId: string, memberId: string, data: { newEndDate: string; planName?: string }) =>
    api.patch<any>(`/gyms/${gymId}/members/${memberId}/renew`, data),

  regenerateQR: (gymId: string, memberId: string) =>
    api.post<any>(`/gyms/${gymId}/members/${memberId}/regenerate-qr`),

  getMemberQR: (gymId: string, memberId: string) =>
    api.get<any>(`/gyms/${gymId}/members/${memberId}/qr`),

  getSelfProfile: () => api.get<{ member: any }>("/members/me"),

  updateMe: (data: any) => api.patch<any>("/members/me", data),

  getMyReferralStats: () => api.get<any>("/members/me/referral-stats"),

  sendReferralAsk: (memberId: string) => api.post<any>(`/members/${memberId}/referral-ask`),
};

export const attendanceApi = {
  checkIn: (
    gymIdOrPayload: string | { gymId?: string; branchId?: string; qrToken?: string; memberId?: string; identifier?: string },
    branchId?: string,
    identifier?: string
  ) => {
    if (typeof gymIdOrPayload === "object") {
      return api.post<{ checkIn: any }>("/attendance/check-in", gymIdOrPayload);
    }
    const payload: Record<string, any> = { gymId: gymIdOrPayload, branchId };
    if (identifier?.startsWith("DYN_QR_") || identifier?.includes("_QR_")) {
      payload.qrToken = identifier;
    } else if (identifier) {
      payload.memberId = identifier;
    }
    return api.post<{ checkIn: any }>("/attendance/check-in", payload);
  },

  checkOut: (attendanceId: string) => api.post<any>("/attendance/check-out", { attendanceId }),

  manualCheckInOut: (data: any) => api.post<any>("/attendance/manual", data),

  generateQR: (gymId: string, branchId?: string, ttlSeconds: number = 25) =>
    api.get<{ qrToken: string; qrCodeDataUrl: string; ttlSeconds: number; expiresAt: string }>(
      branchId
        ? `/gyms/${gymId}/branches/${branchId}/attendance/generate-qr?ttlSeconds=${ttlSeconds}`
        : `/gyms/${gymId}/attendance/generate-qr?ttlSeconds=${ttlSeconds}`
    ),

  getToday: (gymId: string, branchId?: string) =>
    api.get<{ attendance: any[] }>(
      branchId
        ? `/gyms/${gymId}/branches/${branchId}/attendance/daily`
        : `/gyms/${gymId}/attendance/daily`
    ),

  getCurrentSession: () => api.get<any>("/attendance/me/current"),

  getMyHistory: () => api.get<any[]>("/attendance/me/history"),

  getMyStats: () => api.get<any>("/attendance/me/stats"),

  getHeatmap: (gymId: string, branchId?: string) =>
    api.get<{ weeks: any[][]; avgAttendanceRate30d: number }>(
      branchId
        ? `/gyms/${gymId}/branches/${branchId}/attendance/heatmap`
        : `/gyms/${gymId}/attendance-heatmap`
    ),
};

export const workoutApi = {
  listExercises: () => api.get<any[]>("/exercises"),

  getExerciseById: (exerciseId: string) => api.get<any>(`/exercises/${exerciseId}`),

  createExercise: (data: any) => api.post<any>("/exercises", data),

  seedGlobalExercises: () => api.post<any>("/exercises/seed-global"),

  listPlans: (memberId: string) => api.get<any[]>(`/members/${memberId}/workout-plans`),

  getActivePlan: (memberId: string) => api.get<any>(`/members/${memberId}/workout-plans/active`),

  createPlan: (memberId: string, data: any) => api.post<any>(`/members/${memberId}/workout-plans`, data),

  updatePlan: (planId: string, data: any) => api.patch<any>(`/workout-plans/${planId}`, data),

  archivePlan: (planId: string) => api.patch<any>(`/workout-plans/${planId}/archive`),

  duplicatePlan: (planId: string) => api.post<any>(`/workout-plans/${planId}/duplicate`),

  logWorkout: (data: any) => api.post<any>("/workout-logs/start", data),

  logSetProgress: (logId: string, exerciseId: string, setNumber: number, data: { reps: number; weightKg?: number; completed?: boolean }) =>
    api.patch<any>(`/workout-logs/${logId}/exercises/${exerciseId}/sets/${setNumber}`, data),

  markExerciseComplete: (logId: string, exerciseId: string) =>
    api.patch<any>(`/workout-logs/${logId}/exercises/${exerciseId}/complete`),

  completeWorkoutLog: (logId: string) =>
    api.patch<any>(`/workout-logs/${logId}/complete`),

  getHistory: (memberId: string) => api.get<any[]>(`/members/${memberId}/workout-logs`),

  getCompletionStats: (memberId: string) => api.get<any>(`/members/${memberId}/workout-stats`),
};

export const dietApi = {
  listPlans: (memberId: string) => api.get<any[]>(`/members/${memberId}/diet-plans`),

  createPlan: (memberId: string, data: any) => api.post<any>(`/members/${memberId}/diet-plans`, data),

  getActive: (memberId: string) => api.get<any>(`/members/${memberId}/diet-plans/active`),

  updatePlan: (planId: string, data: any) => api.patch<any>(`/diet-plans/${planId}`, data),

  archivePlan: (planId: string) => api.patch<any>(`/diet-plans/${planId}/archive`),
};

export const progressApi = {
  getHistory: (memberId?: string) => api.get<any>(`/progress/weight/history${memberId ? `/${memberId}` : ""}`),

  logWeight: (
    payload: number | { memberId?: string; weightKg: number; heightCm?: number; targetWeightKg?: number; notes?: string },
    notes?: string
  ) => {
    const body = typeof payload === "number" ? { weightKg: payload, notes } : payload;
    return api.post<any>("/progress/weight", body);
  },

  uploadPhoto: (data: { photoUrl: string; notes?: string; bodyFatPercentage?: number }) =>
    api.post<any>("/progress/photos", data),

  getPhotos: () => api.get<any[]>("/progress/photos"),

  logWellness: (data: { energyRating?: number; sleepHours?: number; stressLevel?: string; sorenessNotes?: string }) =>
    api.patch<any>("/progress/wellness", data),

  getWellnessHistory: () => api.get<any[]>("/progress/wellness/history"),

  logDietMeal: (data: { mealType: string; calories?: number; proteinGrams?: number; carbsGrams?: number; fatGrams?: number; notes?: string }) =>
    api.post<any>("/progress/diet-log", data),

  getDietLogs: () => api.get<any[]>("/progress/diet-log"),

  getSummary: () => api.get<any>("/progress/summary"),
};

export const gamificationApi = {
  getMyProfile: () => api.get<any>("/gamification/me"),

  updateRestDays: (restDays: string[]) => api.put<any>("/gamification/me/rest-days", { restDays }),

  getLeaderboard: (gymId?: string) => api.get<any>(`/gamification/leaderboard${gymId ? `?gymId=${gymId}` : ""}`),

  listChallenges: (gymId?: string) => api.get<any[]>(`/gamification/challenges${gymId ? `?gymId=${gymId}` : ""}`),

  createChallenge: (gymId: string, data: any) => api.post<any>(`/gyms/${gymId}/challenges`, data),

  joinChallenge: (challengeId: string) => api.post<any>(`/gamification/challenges/${challengeId}/join`),
};

export const paymentApi = {
  listMemberPayments: (gymId: string) => api.get<any>(`/gyms/${gymId}/payments`),

  recordMemberPayment: (gymId: string, data: any) => api.post<any>(`/gyms/${gymId}/payments/manual`, data),

  initiateOnlineOrder: (gymId: string, data: { amount: number; planName?: string; billingCycle?: string }) =>
    api.post<any>(`/gyms/${gymId}/payments/online-order`, data),

  refundPayment: (gymId: string, paymentId: string, reason?: string) =>
    api.patch<any>(`/gyms/${gymId}/payments/${paymentId}/refund`, { reason }),

  update: (gymId: string, paymentId: string, data: any) =>
    api.patch<any>(`/gyms/${gymId}/payments/${paymentId}`, data),

  delete: (gymId: string, paymentId: string) =>
    api.delete<any>(`/gyms/${gymId}/payments/${paymentId}`),

  getRevenueSummary: (gymId: string) => api.get<any>(`/gyms/${gymId}/payments/revenue-summary`),

  getMyPayments: (gymId: string) => api.get<any>(`/gyms/${gymId}/payments/me`),

  getPlatformBilling: () => api.get<any>("/billing/platform/invoices"),

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

  getTrainerPerformance: (gymId: string) => api.get<any>(`/ai/gyms/${gymId}/insights/trainer-performance`),

  getPeakHours: (gymId: string) => api.get<any>(`/ai/gyms/${gymId}/insights/peak-hours`),

  getRevenueForecast: (gymId: string) => api.get<any>(`/ai/gyms/${gymId}/insights/revenue-forecast`),

  getPlanProfitability: (gymId: string) => api.get<any>(`/ai/gyms/${gymId}/insights/plan-profitability`),

  getSuggestions: (memberId: string) => api.get<any>(`/ai/members/${memberId}/suggestions`),

  getDietRecommendation: (memberId: string) => api.get<any>(`/ai/members/${memberId}/diet-recommendation`),

  getReports: (memberId: string) => api.get<any>(`/ai/members/${memberId}/reports`),

  generateReport: (memberId: string) => api.post<any>(`/ai/members/${memberId}/reports`),

  getGoalPrediction: (memberId: string) => api.get<any>(`/ai/members/${memberId}/goal-prediction`),

  startConversation: (firstMessage: string) =>
    api.post<{ conversation: { _id: string; title: string }; replyMessage: { content: string } }>("/ai/chat/conversations", { firstMessage }),

  sendMessage: (conversationId: string, content: string) =>
    api.post<{ replyMessage: { content: string; role: string } }>(`/ai/chat/conversations/${conversationId}/messages`, { content }),

  getHistory: (conversationId: string) =>
    api.get<{ messages: { _id: string; role: string; content: string; createdAt: string }[] }>(`/ai/chat/conversations/${conversationId}/messages`),

  listConversations: () =>
    api.get<{ conversations: { _id: string; title: string; lastMessageAt: string }[] }>("/ai/chat/conversations"),

  archiveConversation: (conversationId: string) =>
    api.patch<any>(`/ai/chat/conversations/${conversationId}/archive`),

  getUpsellRecommendation: (memberId?: string) =>
    api.get<any>(`/ai/members/${memberId || "me"}/upsell-recommendation`),
};

export const productApi = {
  list: (gymId: string, branchId?: string) =>
    api.get<any[]>(`/gyms/${gymId}/products${branchId ? `?branchId=${branchId}` : ""}`),

  add: (gymId: string, data: any) => api.post<any>(`/gyms/${gymId}/products`, data),

  update: (productId: string, data: any) => api.patch<any>(`/products/${productId}`, data),

  delete: (productId: string) => api.delete<any>(`/products/${productId}`),

  checkout: (productId: string, data: { quantity: number; memberId?: string; paymentMethod?: string; notes?: string }) =>
    api.post<any>(`/products/${productId}/purchase`, data),
};

export const expenseApi = {
  list: (gymId: string) => api.get<any[]>(`/gyms/${gymId}/expenses`),

  add: (gymId: string, data: any) => api.post<any>(`/gyms/${gymId}/expenses`, data),

  getProfitSummary: (gymId: string) => api.get<any>(`/gyms/${gymId}/dashboard/profit-summary`),

  update: (expenseId: string, data: any) => api.patch<any>(`/expenses/${expenseId}`, data),

  delete: (expenseId: string) => api.delete<any>(`/expenses/${expenseId}`),
};

export const leadApi = {
  list: (gymId: string, branchId: string) => api.get<any[]>(`/gyms/${gymId}/branches/${branchId}/leads`),

  create: (gymId: string, branchId: string, data: any) => api.post<any>(`/gyms/${gymId}/branches/${branchId}/leads`, data),

  updateStatus: (_gymId: string, _branchId: string, leadId: string, status: string) =>
    api.patch<any>(`/leads/${leadId}/status`, { status }),

  addNote: (leadId: string, note: string) => api.post<any>(`/leads/${leadId}/notes`, { note }),

  convert: (leadId: string, data?: any) => api.post<any>(`/leads/${leadId}/convert`, data || {}),

  update: (leadId: string, data: any) => api.patch<any>(`/leads/${leadId}`, data),

  delete: (leadId: string) => api.delete<any>(`/leads/${leadId}`),
};

export const equipmentApi = {
  list: (gymId: string, branchId: string) =>
    api.get<any[]>(`/gyms/${gymId}/branches/${branchId}/equipment`),

  getMaintenanceDue: (gymId: string) => api.get<any[]>(`/gyms/${gymId}/equipment/maintenance-due`),

  add: (gymId: string, branchId: string, data: any) =>
    api.post<any>(`/gyms/${gymId}/branches/${branchId}/equipment`, data),

  updateStatus: (id: string, status: string) => api.patch<any>(`/equipment/${id}`, { status }),

  update: (id: string, data: any) => api.patch<any>(`/equipment/${id}`, data),

  delete: (id: string) => api.delete<any>(`/equipment/${id}`),
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

  registerDeviceToken: (deviceToken: string, platform: string = "web") =>
    api.post<any>("/notifications/device-token", { deviceToken, platform }),

  deactivateDeviceToken: (deviceToken: string) =>
    api.delete<any>("/notifications/device-token", { body: { deviceToken } }),

  broadcast: (gymId: string, data: { title: string; message?: string; body?: string; targetRole?: string }) =>
    api.post<any>(`/gyms/${gymId}/notifications/broadcast`, data),

  getWhatsAppLogs: (gymId?: string) =>
    api.get<any>(`/notifications/whatsapp-logs${gymId ? `?gymId=${gymId}` : ""}`),

  getWhatsAppLog: (gymId: string) => api.get<any>(`/gyms/${gymId}/whatsapp-log`),
};

export const privacyApi = {
  exportData: () => api.get<any>("/users/me/export-data"),
  requestDeletion: () => api.post<any>("/users/me/request-deletion"),
  cancelDeletion: () => api.post<any>("/users/me/cancel-deletion"),
};

export const feedbackApi = {
  create: (memberId: string, data: { note: string; rating?: number; workoutLogId?: string }) =>
    api.post<any>(`/members/${memberId}/feedback`, { memberId, ...data }),

  list: (memberId: string) => api.get<any>(`/members/${memberId}/feedback`),

  update: (feedbackId: string, data: any) => api.patch<any>(`/feedback/${feedbackId}`, data),

  delete: (feedbackId: string) => api.delete<any>(`/feedback/${feedbackId}`),
};

export const jobApi = {
  runReminders: (gymId: string) => api.post<any>(`/gyms/${gymId}/jobs/run-reminders`),
};