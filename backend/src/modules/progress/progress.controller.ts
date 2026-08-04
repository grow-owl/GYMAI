import { Request, Response } from 'express';
import { ProgressService } from './progress.service';
import { sendSuccess } from '../../common/utils/ApiResponse';
import { asyncHandler } from '../../common/utils/asyncHandler';

export class ProgressController {
  public static logWeight = asyncHandler(async (req: Request, res: Response) => {
    const memberId = req.user!.id;
    const date = req.body.date ? new Date(req.body.date) : new Date();
    const entry = await ProgressService.logWeight(memberId, req.body.weightKg, date);
    return sendSuccess(res, { entry }, 'Weight logged successfully', 201);
  });

  public static getWeightHistory = asyncHandler(async (req: Request, res: Response) => {
    const memberId = req.params.memberId || req.user!.id;
    const { history, meta } = await ProgressService.getWeightHistory(memberId, req.query);
    return sendSuccess(res, { history }, 'Weight history retrieved successfully', 200, {
      pagination: meta,
    });
  });

  public static uploadProgressPhoto = asyncHandler(async (req: Request, res: Response) => {
    const memberId = req.user!.id;
    const photo = await ProgressService.uploadProgressPhoto(memberId, req.body.imageUrl, req.body.angle);
    return sendSuccess(res, { photo }, 'Progress photo recorded successfully', 201);
  });

  public static getProgressPhotos = asyncHandler(async (req: Request, res: Response) => {
    const memberId = req.params.memberId || req.user!.id;
    const angle = req.query.angle as 'front' | 'side' | 'back' | undefined;
    const { photos, meta } = await ProgressService.getProgressPhotos(memberId, angle, req.query);
    return sendSuccess(res, { photos }, 'Progress photos retrieved successfully', 200, {
      pagination: meta,
    });
  });

  public static logWellness = asyncHandler(async (req: Request, res: Response) => {
    const memberId = req.user!.id;
    const wellness = await ProgressService.logWellness(memberId, req.body);
    return sendSuccess(res, { wellness }, 'Daily wellness logged successfully', 200);
  });

  public static getWellnessHistory = asyncHandler(async (req: Request, res: Response) => {
    const memberId = req.params.memberId || req.user!.id;
    const { history, meta } = await ProgressService.getWellnessHistory(memberId, req.query);
    return sendSuccess(res, { history }, 'Wellness history retrieved successfully', 200, {
      pagination: meta,
    });
  });

  public static getProgressSummary = asyncHandler(async (req: Request, res: Response) => {
    const memberId = req.params.memberId || req.user!.id;
    const summary = await ProgressService.getProgressSummary(memberId);
    return sendSuccess(res, { summary }, 'Progress summary snapshot retrieved successfully');
  });

  public static logDietMeal = asyncHandler(async (req: Request, res: Response) => {
    const memberId = req.user!.id;
    const wellness = await ProgressService.logDietMeal(memberId, req.body);
    return sendSuccess(res, { wellness }, 'Diet meal logged successfully', 201);
  });

  public static getDietLogs = asyncHandler(async (req: Request, res: Response) => {
    const memberId = req.params.memberId || req.user!.id;
    const dietLogs = await ProgressService.getDietLogs(memberId, req.query);
    return sendSuccess(res, { dietLogs }, 'Diet logs retrieved successfully');
  });
}
