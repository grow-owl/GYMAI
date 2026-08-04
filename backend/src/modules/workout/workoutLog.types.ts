import { Types } from 'mongoose';

export interface ILoggedSet {
  setNumber: number;
  reps: number;
  weightKg?: number;
  completed: boolean;
}

export interface ILoggedExercise {
  exerciseId: Types.ObjectId;
  sets: ILoggedSet[];
  completedAt?: Date;
}

export interface IWorkoutLog {
  _id: Types.ObjectId;
  gymId: Types.ObjectId;
  memberId: Types.ObjectId;
  workoutPlanId?: Types.ObjectId; // null if ad-hoc/freestyle workout
  attendanceId?: Types.ObjectId; // links to the check-in session (Module 05)
  dayLabel?: string; // which day of the plan was followed
  exercises: ILoggedExercise[];
  startedAt: Date;
  completedAt?: Date;
  totalDurationMinutes?: number;
  dayKey: string; // for streak/history grouping
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkoutCompletionStats {
  totalWorkoutSessions: number;
  totalPlannedExercises: number;
  totalCompletedExercises: number;
  completionRatePercent: number;
  mostSkippedExercises: { exerciseId: string; name: string; skipCount: number }[];
}
