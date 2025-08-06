import jwt from 'jsonwebtoken';
import { MONGO_URI, JWT_SECRET } from '../config/index.js';

export interface SessionPayload {
  sub: string;    // the user ID
  iat: number;    // issued-at timestamp
  exp: number;    // expiration timestamp
}

export class SessionManager {
  private static session: SessionManager;
  private readonly secret: string;
  private readonly expiresIn: string;

  private constructor() {
    this.secret = JWT_SECRET;
    this.expiresIn = process.env.JWT_EXPIRES_IN || '1h';

  }

  static getInstance() {
    if (!SessionManager.session) {
      SessionManager.session = new SessionManager();
    }
    return SessionManager.session;
  }

  public createSession(userId: string): string {
    return jwt.sign({userId}, this.secret, { expiresIn: '1h' });
  }

public verify(token: string): SessionPayload {
    try {
      return jwt.verify(token, this.secret) as SessionPayload;
    } catch (err) {
      throw new Error('Invalid or expired token');
    }
  }
}
