import bcrypt from 'bcryptjs';
import {
  AppUserAuthConflictError,
  InvalidAppUserCredentialsError,
  isDuplicateAppUserError,
  validateAppUserLogin,
  validateAppUserSignup,
} from '../auth/AppUserAuthContracts.js';
import type { AppUserRepository } from '../repositories/AppUserRepository.js';
import { AppUserTokenService } from './AppUserTokenService.js';

const DUMMY_PASSWORD_HASH = '$2b$10$XLy3YIiss5J8SWiaprxwvOYVwL56SCK4pghiIH1cACzocB0kLTMK.';

export type SerializedAppUser = {
  id: string;
  projectId: string;
  displayName: string;
  email: string;
  createdAt?: Date;
};

export type AppUserAuthResult = {
  token: string;
  user: SerializedAppUser;
};

export class AppUserAuthService {
  constructor(
    private readonly users: AppUserRepository,
    private readonly tokens: AppUserTokenService,
  ) {}

  async signup(
    projectId: string,
    displayNameValue: unknown,
    emailValue: unknown,
    passwordValue: unknown,
  ): Promise<AppUserAuthResult> {
    const credentials = validateAppUserSignup(displayNameValue, emailValue, passwordValue);
    const existing = await this.users.findByEmail(projectId, credentials.emailNormalized);
    if (existing) throw new AppUserAuthConflictError();

    const passwordHash = await bcrypt.hash(credentials.password, 10);
    try {
      const user = await this.users.create({
        projectId,
        displayName: credentials.displayName,
        email: credentials.email,
        emailNormalized: credentials.emailNormalized,
        passwordHash,
      });
      return {
        token: this.tokens.createToken(projectId, String(user.id)),
        user: serializeAppUser(user),
      };
    } catch (error: unknown) {
      if (isDuplicateAppUserError(error)) throw new AppUserAuthConflictError();
      throw error;
    }
  }

  async login(
    projectId: string,
    emailValue: unknown,
    passwordValue: unknown,
  ): Promise<AppUserAuthResult> {
    const credentials = validateAppUserLogin(emailValue, passwordValue);
    const user = await this.users.findByEmail(projectId, credentials.emailNormalized);
    const valid = await bcrypt.compare(credentials.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!user || !valid) throw new InvalidAppUserCredentialsError();

    return {
      token: this.tokens.createToken(projectId, String(user.id)),
      user: serializeAppUser(user),
    };
  }
}

export function serializeAppUser(user: {
  id?: unknown;
  _id?: unknown;
  projectId: string;
  displayName?: string;
  email: string;
  createdAt?: Date;
}): SerializedAppUser {
  return {
    id: String(user.id || user._id),
    projectId: user.projectId,
    displayName: user.displayName || '',
    email: user.email,
    ...(user.createdAt ? { createdAt: user.createdAt } : {}),
  };
}
