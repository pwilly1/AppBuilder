import jwt, { type SignOptions } from 'jsonwebtoken';

export type TokenExpiry = NonNullable<SignOptions['expiresIn']>;

export interface SessionPayload {
  userId: string;
  iat: number;
  exp: number;
}

export class JwtService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: TokenExpiry = '1h',
  ) {}

  createToken(userId: string): string {
    if (!userId) throw new Error('userId is required');
    return jwt.sign({ userId }, this.secret, { expiresIn: this.expiresIn });
  }

  verifyToken(token: string): SessionPayload {
    const decoded = jwt.verify(token, this.secret);
    if (typeof decoded === 'string' || typeof decoded.userId !== 'string') {
      throw new Error('Invalid token payload');
    }
    if (typeof decoded.iat !== 'number' || typeof decoded.exp !== 'number') {
      throw new Error('Invalid token timestamps');
    }
    return {
      userId: decoded.userId,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  }
}
