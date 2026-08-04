import { Router } from 'express';
import { WorkoutLogController } from './workoutLog.controller';
import { authenticate } from '../../common/middlewares/auth.middleware';
import { validate } from '../../common/middlewares/validate.middleware';
import { startWorkoutLogSchema, updateSetSchema } from './workoutLog.validation';

const logRouter = Router();
const memberLogRouter = Router({ mergeParams: true });

// Workout Log tap-by-tap actions (/api/v1/workout-logs/...)
logRouter.use(authenticate);

logRouter.post(
  '/start',
  validate(startWorkoutLogSchema, 'body'),
  WorkoutLogController.startWorkoutLog
);

logRouter.patch(
  '/:logId/exercises/:exerciseId/sets/:setNumber',
  validate(updateSetSchema, 'body'),
  WorkoutLogController.logSetProgress
);

logRouter.patch(
  '/:logId/exercises/:exerciseId/complete',
  WorkoutLogController.markExerciseComplete
);

logRouter.patch('/:logId/complete', WorkoutLogController.completeWorkoutLog);

// Member-scoped workout history and stats (/api/v1/members/:memberId/...)
memberLogRouter.use(authenticate);
memberLogRouter.get('/workout-logs', WorkoutLogController.getWorkoutHistory);
memberLogRouter.get('/workout-stats', WorkoutLogController.getWorkoutCompletionStats);

export { logRouter as workoutLogRouter, memberLogRouter };
