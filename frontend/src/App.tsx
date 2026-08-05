import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import RoleSelect from "@/pages/RoleSelect";
import Landing from "@/pages/Landing";
import DashboardShell from "@/components/layout/DashboardShell";
import MobileShell from "@/components/layout/MobileShell";
import { ownerNav, ownerNavSecondary, trainerNav, receptionNav } from "@/data/nav";
import { gym } from "@/data/mock";
import { useAuth, useAuthStore } from "@/store/authStore";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import AnimatedBackground from "@/components/ui/AnimatedBackground";

import OwnerDashboard from "@/pages/owner/OwnerDashboard";
import Members from "@/pages/owner/Members";
import Trainers from "@/pages/owner/Trainers";
import OwnerAttendance from "@/pages/owner/Attendance";
import OwnerPayments from "@/pages/owner/Payments";
import OwnerLeads from "@/pages/owner/Leads";
import Reports from "@/pages/owner/Reports";
import AIInsights from "@/pages/owner/AIInsights";
import Settings from "@/pages/owner/Settings";
import Inventory from "@/pages/owner/Inventory";
import Expenses from "@/pages/owner/Expenses";
import Equipment from "@/pages/owner/Equipment";
import Billing from "@/pages/owner/Billing";
import Staff from "@/pages/owner/Staff";

import TrainerDashboard from "@/pages/trainer/TrainerDashboard";
import MyClients from "@/pages/trainer/MyClients";
import Sessions from "@/pages/trainer/Sessions";
import WorkoutPlans from "@/pages/trainer/WorkoutPlans";
import DietPlans from "@/pages/trainer/DietPlans";
import TrainerProgress from "@/pages/trainer/Progress";
import RecoveryAlerts from "@/pages/trainer/RecoveryAlerts";

import MemberHome from "@/pages/member/MemberHome";
import WorkoutPlan from "@/pages/member/WorkoutPlan";
import WorkoutTracking from "@/pages/member/WorkoutTracking";
import DietPlan from "@/pages/member/DietPlan";
import AICoach from "@/pages/member/AICoach";
import MemberAttendance from "@/pages/member/Attendance";
import MemberProgress from "@/pages/member/Progress";
import Gamification from "@/pages/member/Gamification";
import MemberPayments from "@/pages/member/Payments";
import Profile from "@/pages/member/Profile";
import Referral from "@/pages/member/Referral";

import ReceptionDashboard from "@/pages/reception/ReceptionDashboard";
import MemberSearch from "@/pages/reception/MemberSearch";
import CheckIn from "@/pages/reception/CheckIn";
import ReceptionLeads from "@/pages/reception/Leads";

import ErrorBoundary from "@/components/ErrorBoundary";
import AdminPanel from "@/pages/admin/AdminPanel";

import BranchComparison from "@/pages/owner/BranchComparison";
import Notifications from "@/pages/Notifications";
import NotFound from "@/pages/NotFound";

function OwnerShell() {
  const { user } = useAuth();
  const firstName = user?.fullName?.split(" ")[0] ?? gym.ownerName;
  const initial = (user?.fullName?.[0] ?? "D").toUpperCase();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const secondaryNav = isSuperAdmin
    ? [{ label: "Admin Panel", path: "/admin", icon: "ShieldCheck" }, ...ownerNavSecondary]
    : ownerNavSecondary;

  return (
    <DashboardShell
      primary={ownerNav}
      secondary={secondaryNav}
      roleLabel={isSuperAdmin ? "Super Admin" : "Owner / Admin"}
      greeting={`Good Morning, ${firstName} 👋`}
      subtitle={String(user?.gymName || "My Gym")}
      avatarInitial={initial}
    />
  );
}

function TrainerShell() {
  const { user } = useAuth();
  const firstName = user?.fullName?.split(" ")[0] ?? "Trainer";
  const initial = (user?.fullName?.[0] ?? "T").toUpperCase();
  return (
    <DashboardShell
      primary={trainerNav}
      roleLabel="Trainer"
      greeting={`Good Morning, ${firstName} 👋`}
      subtitle={String(user?.gymName || gym.name)}
      avatarInitial={initial}
    />
  );
}

function ReceptionShell() {
  const { user } = useAuth();
  return (
    <DashboardShell
      primary={receptionNav}
      roleLabel="Reception / Staff"
      greeting="Front Desk"
      subtitle={String(user?.gymName || gym.name)}
      avatarInitial="R"
    />
  );
}

export default function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <ErrorBoundary>
      <AnimatedBackground />
      <div className="content-layer">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/roles" element={<RoleSelect />} />

            <Route element={<ProtectedRoute allowedRoles={["SUPER_ADMIN"]} />}>
              <Route path="/admin" element={<OwnerShell />}>
                <Route index element={<AdminPanel />} />
                <Route path="notifications" element={<Notifications />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["GYM_OWNER", "SUPER_ADMIN", "BRANCH_MANAGER"]} />}>
              <Route path="/owner" element={<OwnerShell />}>
                <Route index element={<OwnerDashboard />} />
                <Route path="members" element={<Members />} />
                <Route path="trainers" element={<Trainers />} />
                <Route path="staff" element={<Staff />} />
                <Route path="attendance" element={<OwnerAttendance />} />
                <Route path="payments" element={<OwnerPayments />} />
                <Route path="leads" element={<OwnerLeads />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="equipment" element={<Equipment />} />
                <Route path="billing" element={<Billing />} />
                <Route path="reports" element={<Reports />} />
                <Route path="ai-insights" element={<AIInsights />} />
                <Route path="branch-comparison" element={<BranchComparison />} />
                <Route path="settings" element={<Settings />} />
                <Route path="notifications" element={<Notifications />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["TRAINER"]} />}>
              <Route path="/trainer" element={<TrainerShell />}>
                <Route index element={<TrainerDashboard />} />
                <Route path="clients" element={<MyClients />} />
                <Route path="sessions" element={<Sessions />} />
                <Route path="workout-plans" element={<WorkoutPlans />} />
                <Route path="diet-plans" element={<DietPlans />} />
                <Route path="progress" element={<TrainerProgress />} />
                <Route path="recovery-alerts" element={<RecoveryAlerts />} />
                <Route path="notifications" element={<Notifications />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["KIOSK", "BRANCH_MANAGER", "GYM_OWNER", "SUPER_ADMIN"]} />}>
              <Route path="/reception" element={<ReceptionShell />}>
                <Route index element={<ReceptionDashboard />} />
                <Route path="members" element={<Members />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="search" element={<MemberSearch />} />
                <Route path="check-in" element={<CheckIn />} />
                <Route path="leads" element={<ReceptionLeads />} />
                <Route path="payments" element={<OwnerPayments />} />
                <Route path="notifications" element={<Notifications />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["MEMBER"]} />}>
              <Route path="/member" element={<MobileShell />}>
                <Route index element={<MemberHome />} />
                <Route path="workout-plan" element={<WorkoutPlan />} />
                <Route path="workout-tracking" element={<WorkoutTracking />} />
                <Route path="diet-plan" element={<DietPlan />} />
                <Route path="ai-coach" element={<AICoach />} />
                <Route path="attendance" element={<MemberAttendance />} />
                <Route path="progress" element={<MemberProgress />} />
                <Route path="rewards" element={<Gamification />} />
                <Route path="payments" element={<MemberPayments />} />
                <Route path="profile" element={<Profile />} />
                <Route path="referral" element={<Referral />} />
                <Route path="notifications" element={<Notifications />} />
              </Route>
            </Route>

            {/* Catch-all 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </div>
    </ErrorBoundary>
  );
}
