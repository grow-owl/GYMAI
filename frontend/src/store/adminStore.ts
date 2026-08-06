import { create } from "zustand";

export interface GymTenant {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  subscriptionPlan: "STARTER" | "PRO" | "ENTERPRISE";
  status: "ACTIVE" | "SUSPENDED" | "TRIAL";
  branchesCount: number;
  totalMembers: number;
  createdAt: string;
  monthlyRevenue: number;
}

export interface BranchInfo {
  id: string;
  gymId: string;
  gymName: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  activeMembers: number;
  status: "ACTIVE" | "INACTIVE";
}

export interface UserSummary {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: "SUPER_ADMIN" | "GYM_OWNER" | "BRANCH_MANAGER" | "TRAINER" | "MEMBER" | "KIOSK";
  gymName: string;
  branchName?: string;
  createdAt: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
}

export interface SystemSettings {
  maintenanceMode: boolean;
  allowSelfRegistration: boolean;
  defaultTrialDays: number;
  maxBranchesPerStarter: number;
  maxBranchesPerPro: number;
  platformCurrency: string;
  supportEmail: string;
  whatsappAlertsEnabled: boolean;
}

interface AdminState {
  gyms: GymTenant[];
  branches: BranchInfo[];
  users: UserSummary[];
  settings: SystemSettings;
  loading: boolean;
  searchQuery: string;
  statusFilter: string;

  // Actions
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: string) => void;
  toggleGymStatus: (gymId: string) => void;
  addGym: (gym: Omit<GymTenant, "id" | "createdAt">) => void;
  addBranch: (branch: Omit<BranchInfo, "id">) => void;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  resetUserPassword: (email: string) => Promise<{ success: boolean; message: string }>;
}

const mockGyms: GymTenant[] = [
  {
    id: "gym-1",
    name: "PowerGym Central",
    ownerName: "Rahul Sharma",
    ownerEmail: "rahul@powergym.com",
    ownerPhone: "9876543210",
    subscriptionPlan: "PRO",
    status: "ACTIVE",
    branchesCount: 3,
    totalMembers: 450,
    createdAt: "2026-01-15",
    monthlyRevenue: 125000,
  },
  {
    id: "gym-2",
    name: "Iron Paradise Fitness",
    ownerName: "Priya Verma",
    ownerEmail: "priya@ironparadise.com",
    ownerPhone: "9812345678",
    subscriptionPlan: "ENTERPRISE",
    status: "ACTIVE",
    branchesCount: 5,
    totalMembers: 890,
    createdAt: "2025-11-20",
    monthlyRevenue: 280000,
  },
  {
    id: "gym-3",
    name: "FitZone Studio",
    ownerName: "Amit Patel",
    ownerEmail: "amit@fitzone.com",
    ownerPhone: "9988776655",
    subscriptionPlan: "STARTER",
    status: "TRIAL",
    branchesCount: 1,
    totalMembers: 65,
    createdAt: "2026-02-01",
    monthlyRevenue: 18000,
  },
  {
    id: "gym-4",
    name: "Velocity Crossfit",
    ownerName: "Vikram Singh",
    ownerEmail: "vikram@velocity.com",
    ownerPhone: "9765432109",
    subscriptionPlan: "PRO",
    status: "SUSPENDED",
    branchesCount: 2,
    totalMembers: 210,
    createdAt: "2025-08-10",
    monthlyRevenue: 0,
  },
];

const mockBranches: BranchInfo[] = [
  { id: "b-1", gymId: "gym-1", gymName: "PowerGym Central", name: "Main Branch Connaught Place", city: "New Delhi", address: "Block A, CP", phone: "9876543210", activeMembers: 220, status: "ACTIVE" },
  { id: "b-2", gymId: "gym-1", gymName: "PowerGym Central", name: "Gurugram Cyber Hub", city: "Gurugram", address: "Phase 3, Cyber City", phone: "9876543211", activeMembers: 130, status: "ACTIVE" },
  { id: "b-3", gymId: "gym-1", gymName: "PowerGym Central", name: "Noida Sector 62", city: "Noida", address: "Sector 62", phone: "9876543212", activeMembers: 100, status: "ACTIVE" },
  { id: "b-4", gymId: "gym-2", gymName: "Iron Paradise Fitness", name: "Bandra Flagship", city: "Mumbai", address: "Hill Road, Bandra", phone: "9812345678", activeMembers: 350, status: "ACTIVE" },
  { id: "b-5", gymId: "gym-2", gymName: "Iron Paradise Fitness", name: "Andheri West", city: "Mumbai", address: "Link Road, Andheri", phone: "9812345679", activeMembers: 280, status: "ACTIVE" },
];

const mockUsers: UserSummary[] = [
  { id: "u-1", fullName: "Rahul Sharma", email: "rahul@powergym.com", phone: "9876543210", role: "GYM_OWNER", gymName: "PowerGym Central", createdAt: "2026-01-15", status: "ACTIVE" },
  { id: "u-2", fullName: "Priya Verma", email: "priya@ironparadise.com", phone: "9812345678", role: "GYM_OWNER", gymName: "Iron Paradise Fitness", createdAt: "2025-11-20", status: "ACTIVE" },
  { id: "u-3", fullName: "Karan Johar", email: "karan@powergym.com", phone: "9876500001", role: "TRAINER", gymName: "PowerGym Central", branchName: "Main Branch CP", createdAt: "2026-01-18", status: "ACTIVE" },
  { id: "u-4", fullName: "Simran Kaur", email: "simran@powergym.com", phone: "9876500002", role: "BRANCH_MANAGER", gymName: "PowerGym Central", branchName: "Gurugram Cyber Hub", createdAt: "2026-01-20", status: "ACTIVE" },
  { id: "u-5", fullName: "Rohan Kapoor", email: "rohan@gmail.com", phone: "9876500003", role: "MEMBER", gymName: "PowerGym Central", branchName: "Main Branch CP", createdAt: "2026-01-25", status: "ACTIVE" },
];

export const useAdminStore = create<AdminState>((set, get) => ({
  gyms: mockGyms,
  branches: mockBranches,
  users: mockUsers,
  settings: {
    maintenanceMode: false,
    allowSelfRegistration: true,
    defaultTrialDays: 14,
    maxBranchesPerStarter: 1,
    maxBranchesPerPro: 5,
    platformCurrency: "INR (₹)",
    supportEmail: "support@gymai.com",
    whatsappAlertsEnabled: true,
  },
  loading: false,
  searchQuery: "",
  statusFilter: "ALL",

  setSearchQuery: (query) => set({ searchQuery: query }),
  setStatusFilter: (status) => set({ statusFilter: status }),

  toggleGymStatus: (gymId) =>
    set((state) => ({
      gyms: state.gyms.map((g) =>
        g.id === gymId
          ? { ...g, status: g.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" }
          : g
      ),
    })),

  addGym: (newGymData) => {
    const newGym: GymTenant = {
      ...newGymData,
      id: `gym-${Date.now()}`,
      createdAt: new Date().toISOString().split("T")[0],
    };
    set((state) => ({ gyms: [newGym, ...state.gyms] }));
  },

  addBranch: (branchData) => {
    const newBranch: BranchInfo = {
      ...branchData,
      id: `b-${Date.now()}`,
    };
    set((state) => ({ branches: [newBranch, ...state.branches] }));
  },

  updateSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),

  resetUserPassword: async (email) => {
    const userExists = get().users.some(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (!userExists) {
      return { success: false, message: "User with this email address was not found in the platform." };
    }
    return {
      success: true,
      message: `Password reset link and temporary security OTP sent to ${email}`,
    };
  },
}));
