import type { NextFunction, Request, Response } from 'express';
import {
  AiGenerationOutputError,
  AiGenerationRateLimitError,
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
      handleAiGenerationError(error, res, next);
    }
  };

  correctProposal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = getRouteParam(req, 'projectId');
      if (!projectId) {
        res.status(400).json({ error: 'Missing projectId' });
        return;
      }
      const proposal = await this.generation.correctProposal(
        getUserId(req),
        projectId,
        req.body,
      );
      res.status(200).json(proposal);
    } catch (error) {
      handleAiGenerationError(error, res, next);
    }
  };

  getUsage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = getRouteParam(req, 'projectId');
      if (!projectId) {
        res.status(400).json({ error: 'Missing projectId' });
        return;
      }
      const usage = await this.generation.getUsage(getUserId(req), projectId);
      res.status(200).json(usage);
    } catch (error) {
      handleAiGenerationError(error, res, next);
    }
  };
}

function handleAiGenerationError(
  error: unknown,
  res: Response,
  next: NextFunction,
): void {
  if (error instanceof AiGenerationRequestError) {
    res.status(400).json({ error: error.message });
    return;
  }
  if (error instanceof AiGenerationRateLimitError) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((Date.parse(error.quota.resetsAt) - Date.now()) / 1_000),
    );
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({ error: error.message, quota: error.quota });
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
