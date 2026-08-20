import { Router } from 'express';
import { WorkoutLogController } from './workoutLog.controller';
import { authenticate } from '../../common/middlewares/auth.middleware';
import { authorize } from '../../common/middlewares/authorize.middleware';
import { validate } from '../../common/middlewares/validate.middleware';
import { Role } from '../../common/constants/roles.enum';
import { startWorkoutLogSchema, updateSetSchema } from './workoutLog.validation';

const logRouter = Router();
const memberLogRouter = Router({ mergeParams: true });

// Workout Log tap-by-tap actions (/api/v1/workout-logs/...)
logRouter.use(authenticate);

logRouter.post(
  '/start',
  authorize(Role.MEMBER, Role.TRAINER, Role.GYM_OWNER, Role.BRANCH_MANAGER, Role.SUPER_ADMIN),
  validate(startWorkoutLogSchema, 'body'),
  WorkoutLogController.startWorkoutLog
);

logRouter.patch(
  '/:logId/exercises/:exerciseId/sets/:setNumber',
  authorize(Role.MEMBER, Role.TRAINER, Role.GYM_OWNER, Role.BRANCH_MANAGER, Role.SUPER_ADMIN),
  validate(updateSetSchema, 'body'),
  WorkoutLogController.logSetProgress
);

logRouter.patch(
  '/:logId/exercises/:exerciseId/complete',
  authorize(Role.MEMBER, Role.TRAINER, Role.GYM_OWNER, Role.BRANCH_MANAGER, Role.SUPER_ADMIN),
  WorkoutLogController.markExerciseComplete
);

logRouter.patch(
  '/:logId/complete',
  authorize(Role.MEMBER, Role.TRAINER, Role.GYM_OWNER, Role.BRANCH_MANAGER, Role.SUPER_ADMIN),
  WorkoutLogController.completeWorkoutLog
);

// Member-scoped workout history and stats (/api/v1/members/:memberId/...)
memberLogRouter.use(authenticate);
memberLogRouter.get(
  '/workout-logs',
  authorize(Role.MEMBER, Role.TRAINER, Role.GYM_OWNER, Role.BRANCH_MANAGER, Role.SUPER_ADMIN, Role.KIOSK),
  WorkoutLogController.getWorkoutHistory
);
memberLogRouter.get(
  '/workout-stats',
  authorize(Role.MEMBER, Role.TRAINER, Role.GYM_OWNER, Role.BRANCH_MANAGER, Role.SUPER_ADMIN, Role.KIOSK),
  WorkoutLogController.getWorkoutCompletionStats
);

export { logRouter as workoutLogRouter, memberLogRouter };
