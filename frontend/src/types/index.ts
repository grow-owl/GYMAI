export type Role = "owner" | "trainer" | "member" | "reception";

export interface NavItem {
  label: string;
  path: string;
  icon: keyof typeof import("lucide-react");
}

export interface KpiDatum {
  label: string;
  value: string;
  delta?: string;
  deltaDirection?: "up" | "down";
  icon: string;
}

export interface QuickLink {
  label: string;
  path: string;
  icon: string;
  tone?: "default" | "accent";
}

export interface Member {
  id: string;
  name: string;
  plan: string;
  status: "active" | "expiring" | "overdue" | "trial";
  joined: string;
  trainer?: string;
  churnRisk?: "low" | "medium" | "high";
}

export interface Trainer {
  id: string;
  name: string;
  clients: number;
  specialty: string;
  rating: number;
  sessionsToday: number;
}

export interface Session {
  id: string;
  time: string;
  clientName: string;
  type: string;
  status: "upcoming" | "done" | "missed";
}

export interface Lead {
  id: string;
  name: string;
  interest: string;
  source: string;
  stage: "new" | "contacted" | "trial" | "joined";
  trialDate?: string;
  assignedTrainer?: string;
}

export interface Exercise {
  id: string;
  name: string;
  sets: { set: number; kg: number; reps: number; done: boolean }[];
  previous: string;
}
