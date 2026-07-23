import jwt, { type SignOptions } from 'jsonwebtoken';

export type AppUserTokenExpiry = NonNullable<SignOptions['expiresIn']>;

export type AppUserSessionPayload = {
  appUserId: string;
  projectId: string;
  tokenType: 'app-user';
  iat: number;
  exp: number;
};

export class AppUserTokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: AppUserTokenExpiry = '7d',
  ) {}

  createToken(projectId: string, appUserId: string): string {
    if (!projectId || !appUserId) throw new Error('projectId and appUserId are required');
    return jwt.sign(
      { appUserId, projectId, tokenType: 'app-user' },
      this.secret,
      { expiresIn: this.expiresIn },
    );
  }

  verifyToken(token: string): AppUserSessionPayload {
    const decoded = jwt.verify(token, this.secret);
    if (
      typeof decoded === 'string'
      || decoded.tokenType !== 'app-user'
      || typeof decoded.appUserId !== 'string'
      || typeof decoded.projectId !== 'string'
      || typeof decoded.iat !== 'number'
      || typeof decoded.exp !== 'number'
    ) {
      throw new Error('Invalid app-user token payload');
    }

    return {
      appUserId: decoded.appUserId,
      projectId: decoded.projectId,
      tokenType: 'app-user',
      iat: decoded.iat,
      exp: decoded.exp,
    };
  }
}
