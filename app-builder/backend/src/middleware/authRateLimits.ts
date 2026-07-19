import type { Request, Response } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { normalizeUsernameLookup } from '../auth/AuthContracts.js';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

// The default memory store matches the current single-instance deployment.
// Use a shared store before scaling the backend across multiple instances.

function requestIpKey(req: Request): string {
  return ipKeyGenerator(req.ip || req.socket.remoteAddress || 'unknown');
}

function sendRateLimitResponse(_req: Request, res: Response) {
  res.status(429).json({ error: 'Too many attempts. Please try again later.' });
}

const commonOptions = {
  standardHeaders: 'draft-8' as const,
  legacyHeaders: false,
  handler: sendRateLimitResponse,
};

export const loginIpRateLimit = rateLimit({
  ...commonOptions,
  windowMs: FIFTEEN_MINUTES_MS,
  limit: 20,
  skipSuccessfulRequests: true,
  keyGenerator: requestIpKey,
});

export const loginAccountRateLimit = rateLimit({
  ...commonOptions,
  windowMs: FIFTEEN_MINUTES_MS,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const username = typeof req.body?.username === 'string'
      ? normalizeUsernameLookup(req.body.username)
      : '';
    return username ? `account:${username}` : `ip:${requestIpKey(req)}`;
  },
});

export const signupRateLimit = rateLimit({
  ...commonOptions,
  windowMs: ONE_HOUR_MS,
  limit: 10,
  keyGenerator: requestIpKey,
});

export const guestSessionRateLimit = rateLimit({
  ...commonOptions,
  windowMs: ONE_HOUR_MS,
  limit: 20,
  keyGenerator: requestIpKey,
});
