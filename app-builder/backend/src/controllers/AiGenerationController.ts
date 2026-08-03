import type { NextFunction, Request, Response } from 'express';
import {
  AiGenerationOutputError,
  AiGenerationRequestError,
  AiModelProviderError,
} from '../ai/AiGenerationErrors.js';
import { AiGenerationService } from '../ai/AiGenerationService.js';
import {
  getRouteParam,
  getUserId,
  handleControllerError,
} from './controllerUtils.js';

export class AiGenerationController {
  constructor(private readonly generation: AiGenerationService) {}

  createProposal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = getRouteParam(req, 'projectId');
      if (!projectId) {
        res.status(400).json({ error: 'Missing projectId' });
        return;
      }
      const proposal = await this.generation.generateProposal(
        getUserId(req),
        projectId,
        req.body,
      );
      res.status(200).json(proposal);
    } catch (error) {
      if (error instanceof AiGenerationRequestError) {
        res.status(400).json({ error: error.message });
        return;
      }
      if (error instanceof AiGenerationOutputError) {
        res.status(422).json({ error: error.message, issues: error.issues });
        return;
      }
      if (error instanceof AiModelProviderError) {
        res.status(502).json({ error: error.message });
        return;
      }
      handleControllerError(error, res, next);
    }
  };
}
