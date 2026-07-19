import { AuthService } from '../services/AuthService.js';
// © 2025 Preston Willis. All rights reserved.
import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from './controllerUtils.js';
import {
  AuthConflictError,
  AuthValidationError,
  InvalidCredentialsError,
} from '../auth/AuthContracts.js';

export class AuthController {
    private readonly authService: AuthService;

    constructor(authService: AuthService){
        this.authService = authService;
    }

    public me(req: Request, res: Response) {
        const authenticated = req as AuthenticatedRequest;
        const user = authenticated.user;
        if (!authenticated.userId || !user) {
            res.status(401).json({ error: 'Missing authenticated user' });
            return;
        }

        res.json({
            user: {
                id: authenticated.userId,
                username: user.username,
                email: user.email,
                isGuest: Boolean(user.isGuest),
                ...(user.createdAt ? { createdAt: user.createdAt } : {}),
            },
        });
    }


    public async login(req: Request, res: Response) {
        try {
            const body = req.body as Record<string, unknown> | undefined;
            const username = body?.username;
            const password = body?.password;
            const token = await this.authService.login(username, password);
            res.json({ token });
        } catch (error: unknown) {
            if (error instanceof InvalidCredentialsError || error instanceof AuthValidationError) {
                res.status(401).json({ error: 'Invalid username or password.' });
                return;
            }
            console.error('Login failed:', error);
            res.status(500).json({ error: 'Unable to sign in right now.' });
        }
    }

    public async guest(_req: Request, res: Response) {
        try {
            const token = await this.authService.guest();
            res.json({ token });
        } catch (error: unknown) {
            console.error('Guest session creation failed:', error);
            res.status(500).json({ error: 'Unable to start a guest session right now.' });
        }
    }

    public async signup(req: Request, res: Response) {
        try {
            const body = req.body as Record<string, unknown> | undefined;
            const username = body?.username;
            const email = body?.email;
            const password = body?.password;
            const token = await this.authService.signup(username, email, password);
            res.status(201).json({ token });
        } catch (error: unknown) {
            if (error instanceof AuthValidationError) {
                res.status(400).json({ error: error.message });
                return;
            }
            if (error instanceof AuthConflictError) {
                res.status(400).json({ error: error.message });
                return;
            }
            console.error('Signup failed:', error);
            res.status(500).json({ error: 'Unable to create an account right now.' });
        }
    }
}
