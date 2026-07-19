// © 2025 Preston Willis. All rights reserved.
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import type { IUserRepository } from '../repositories/UserRepository.js';
import { JwtService } from './JwtService.js';
import {
  AuthConflictError,
  InvalidCredentialsError,
  isDuplicateKeyError,
  normalizeEmail,
  normalizeUsernameLookup,
  validateLoginCredentials,
  validateSignupCredentials,
} from '../auth/AuthContracts.js';

const DUMMY_PASSWORD_HASH = '$2b$10$XLy3YIiss5J8SWiaprxwvOYVwL56SCK4pghiIH1cACzocB0kLTMK.';

export class AuthService {
  private readonly users: IUserRepository;
  private readonly tokens: JwtService;

  constructor(users: IUserRepository, tokens: JwtService) {
    this.users = users;
    this.tokens = tokens;
  }
  
  public async signup(usernameValue: unknown, emailValue: unknown, passwordValue: unknown) {
    const credentials = validateSignupCredentials(usernameValue, emailValue, passwordValue);
    const [usernameMatch, emailMatch] = await Promise.all([
      this.users.findByUsername(credentials.username),
      this.users.findByEmail(credentials.email),
    ]);
    if (usernameMatch || emailMatch) throw new AuthConflictError();

    const passwordHash = await bcrypt.hash(credentials.password, 10);
    try {
      const user = await this.users.create({
        username: credentials.username,
        usernameNormalized: credentials.usernameNormalized,
        email: credentials.email,
        emailNormalized: credentials.emailNormalized,
        passwordHash,
        isGuest: false,
      });
      return this.tokens.createToken(String(user.id));
    } catch (error: unknown) {
      if (isDuplicateKeyError(error)) throw new AuthConflictError();
      throw error;
    }
  }

  public async guest() {
    const unique = `guest_${randomUUID()}`;
    const username = unique;
    const email = `${unique}@guest.local`;
    const passwordHash = await bcrypt.hash(randomUUID(), 10);
    const user = await this.users.create({
      username,
      usernameNormalized: normalizeUsernameLookup(username),
      email,
      emailNormalized: normalizeEmail(email),
      passwordHash,
      isGuest: true,
    });
    return this.tokens.createToken(String(user.id));
  }

  public async login(usernameValue: unknown, passwordValue: unknown) {
    const credentials = validateLoginCredentials(usernameValue, passwordValue);
    const user = await this.users.findByUsername(credentials.username);
    const valid = await bcrypt.compare(credentials.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!user || !valid) throw new InvalidCredentialsError();

    return this.tokens.createToken(String(user.id));
  }
}
