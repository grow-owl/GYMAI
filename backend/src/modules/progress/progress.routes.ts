import { Router } from 'express';
import { ProgressController } from './progress.controller';
import { authenticate } from '../../common/middlewares/auth.middleware';
import { authorize } from '../../common/middlewares/authorize.middleware';
import { validate } from '../../common/middlewares/validate.middleware';
import { Role } from '../../common/constants/roles.enum';
import { logWeightSchema, uploadProgressPhotoSchema, logWellnessSchema, logMealSchema } from './progress.validation';

const router = Router();

router.use(authenticate);

// Member Self-Logging
router.post(
  '/weight',
  authorize(Role.MEMBER),
  validate(logWeightSchema, 'body'),
  ProgressController.logWeight
);
router.get('/weight/history', ProgressController.getWeightHistory);

router.post(
  '/photos',
  authorize(Role.MEMBER),
  validate(uploadProgressPhotoSchema, 'body'),
  ProgressController.uploadProgressPhoto
);
router.get('/photos', ProgressController.getProgressPhotos);

router.patch(
  '/wellness',
  authorize(Role.MEMBER),
  validate(logWellnessSchema, 'body'),
  ProgressController.logWellness
);
router.get('/wellness/history', ProgressController.getWellnessHistory);

router.post(
  '/diet-log',
  authorize(Role.MEMBER),
  validate(logMealSchema, 'body'),
  ProgressController.logDietMeal
);
router.get('/diet-log', ProgressController.getDietLogs);

router.get('/summary', ProgressController.getProgressSummary);

export default router;
