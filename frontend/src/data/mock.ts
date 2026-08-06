import type { Member, Trainer, Session, Lead, Exercise } from "@/types";

export const gym = {
  name: "Spartan Fitness",
  branch: "Connaught Place Branch",
  ownerName: "Dhiraj",
  trainerName: "Rahul",
  memberName: "Dhiraj",
};

export const ownerKpis = [
  { label: "Members", value: "1,248", delta: "+8.2%", deltaDirection: "up" as const, icon: "Users" },
  { label: "Revenue", value: "₹3.82L", delta: "+12.5%", deltaDirection: "up" as const, icon: "IndianRupee" },
  { label: "Trainers", value: "32", icon: "Dumbbell" },
  { label: "Churn Risk", value: "18", delta: "watch", deltaDirection: "down" as const, icon: "AlertTriangle" },
];

export const ownerQuickAccess = [
  { label: "Members", path: "/owner/members", icon: "Users" },
  { label: "Trainers", path: "/owner/trainers", icon: "Dumbbell" },
  { label: "Attendance", path: "/owner/attendance", icon: "QrCode" },
  { label: "Payments", path: "/owner/payments", icon: "CreditCard" },
  { label: "Leads", path: "/owner/leads", icon: "Target" },
  { label: "Inventory", path: "/owner/inventory", icon: "Package" },
  { label: "Expenses", path: "/owner/expenses", icon: "Wallet" },
  { label: "Reports", path: "/owner/reports", icon: "BarChart3" },
  { label: "AI Insights", path: "/owner/ai-insights", icon: "Sparkles" },
];

export const members: Member[] = [
  { id: "m1", name: "Amit Kumar", plan: "Premium Annual", status: "active", joined: "12 Jan 2025", trainer: "Rahul", churnRisk: "high" },
  { id: "m2", name: "Rohit Das", plan: "Quarterly", status: "active", joined: "03 Mar 2025", trainer: "Rahul", churnRisk: "low" },
  { id: "m3", name: "Priya Singh", plan: "Monthly", status: "expiring", joined: "20 May 2025", trainer: "Neha", churnRisk: "medium" },
  { id: "m4", name: "Dhiraj Sen", plan: "Premium Annual", status: "active", joined: "14 Aug 2024", trainer: "Rahul", churnRisk: "low" },
  { id: "m5", name: "Aman Verma", plan: "Monthly", status: "overdue", joined: "02 Feb 2025", trainer: "Neha", churnRisk: "high" },
  { id: "m6", name: "Sneha Roy", plan: "Quarterly", status: "trial", joined: "28 Jul 2026", trainer: "Amit", churnRisk: "low" },
];

export const trainers: Trainer[] = [
  { id: "t1", name: "Rahul Mehta", clients: 24, specialty: "Strength & Conditioning", rating: 4.8, sessionsToday: 7 },
  { id: "t2", name: "Neha Kapoor", clients: 19, specialty: "Weight Loss", rating: 4.9, sessionsToday: 5 },
  { id: "t3", name: "Amit Joshi", clients: 15, specialty: "Rehab & Mobility", rating: 4.6, sessionsToday: 3 },
];

export const todaysSessions: Session[] = [
  { id: "s1", time: "09:00 AM", clientName: "Amit Kumar", type: "Push Day", status: "done" },
  { id: "s2", time: "10:30 AM", clientName: "Rohit Das", type: "Strength Assessment", status: "upcoming" },
  { id: "s3", time: "01:00 PM", clientName: "Priya Singh", type: "Recovery Session", status: "upcoming" },
  { id: "s4", time: "03:30 PM", clientName: "Sneha Roy", type: "Trial Session", status: "upcoming" },
];

export const leads: Lead[] = [
  { id: "l1", name: "Rahul Sharma", interest: "Weight Loss", source: "Instagram", stage: "trial", trialDate: "Aug 04", assignedTrainer: "Amit" },
  { id: "l2", name: "Kabir Ahuja", interest: "Muscle Gain", source: "Walk-in", stage: "contacted", assignedTrainer: "Rahul" },
  { id: "l3", name: "Meera Nair", interest: "General Fitness", source: "Referral", stage: "new" },
  { id: "l4", name: "Vikram Rao", interest: "Strength Training", source: "Facebook", stage: "joined" },
];

export const leadPipeline = [
  { stage: "New", count: 124 },
  { stage: "Contacted", count: 72 },
  { stage: "Trial", count: 38 },
  { stage: "Joined", count: 24 },
];

export const memberQuickAccess = [
  { label: "Workout Plan", path: "/member/workout-plan", icon: "Dumbbell" },
  { label: "Diet Plan", path: "/member/diet-plan", icon: "Salad" },
  { label: "AI Coach", path: "/member/ai-coach", icon: "Sparkles", tone: "accent" as const },
  { label: "Progress", path: "/member/progress", icon: "LineChart" },
  { label: "Attendance", path: "/member/attendance", icon: "QrCode" },
  { label: "Rewards", path: "/member/rewards", icon: "Trophy" },
];

export const todaysWorkout = {
  name: "Push Day",
  focus: "Chest • Shoulder • Triceps",
  exerciseCount: 6,
  estMinutes: 48,
};

export const pushDayExercises: Exercise[] = [
  {
    id: "e1",
    name: "Bench Press",
    previous: "70kg × 8",
    sets: [
      { set: 1, kg: 70, reps: 10, done: true },
      { set: 2, kg: 75, reps: 8, done: true },
      { set: 3, kg: 75, reps: 8, done: false },
      { set: 4, kg: 70, reps: 10, done: false },
    ],
  },
  {
    id: "e2",
    name: "Incline Dumbbell Press",
    previous: "24kg × 10",
    sets: [
      { set: 1, kg: 24, reps: 10, done: false },
      { set: 2, kg: 24, reps: 10, done: false },
      { set: 3, kg: 22, reps: 12, done: false },
    ],
  },
  {
    id: "e3",
    name: "Overhead Shoulder Press",
    previous: "40kg × 8",
    sets: [
      { set: 1, kg: 40, reps: 8, done: false },
      { set: 2, kg: 40, reps: 8, done: false },
      { set: 3, kg: 35, reps: 10, done: false },
    ],
  },
];

export const gamification = {
  level: 12,
  xp: 2480,
  xpToNext: 3000,
  streak: 18,
  badges: [
    { icon: "Flame", label: "30 Day Streak" },
    { icon: "Dumbbell", label: "Strong Starter" },
    { icon: "Zap", label: "Early Bird" },
  ],
  monthStats: [
    { label: "Workouts", value: "21" },
    { label: "Attendance", value: "24" },
    { label: "XP Earned", value: "+820" },
  ],
  leaderboard: [
    { rank: 1, name: "Rahul", xp: "8,940 XP" },
    { rank: 2, name: "Aman", xp: "8,720 XP" },
    { rank: 3, name: "Dhiraj", xp: "8,410 XP" },
    { rank: 4, name: "Rohit", xp: "7,920 XP" },
  ],
};

export const clientRecoveryAlert = {
  name: "Amit Kumar",
  score: 42,
  note: "High fatigue detected. Training intensity should be reduced for the next session.",
};

export const memberPayment = {
  plan: "Premium Annual",
  validUntil: "12 Aug 2027",
  price: "₹12,999 / year",
  status: "ACTIVE",
};

export const ownerRevenue = {
  total: "₹3,82,450",
  delta: "+12.5%",
  collected: "₹3.42L",
  pending: "₹31,200",
  overdue: "₹9,250",
};

export const attendanceToday = {
  checkedIn: 184,
  currentlyIn: 67,
  checkedOut: 117,
  peakTime: "6:00 PM – 8:00 PM",
};

export const aiOwnerInsight = {
  headline: "Weekly Business Summary",
  points: [
    "Revenue increased 12.4% this week.",
    "Evening attendance is up 18%.",
    "18 members currently show high churn probability.",
  ],
};
