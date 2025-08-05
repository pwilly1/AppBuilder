import bcrypt from 'bcryptjs';
import type { IUserRepository } from '../repositories/UserRepository';
import { SessionManager } from './SessionManager';

export class AuthService {
      private users: IUserRepository;
      private sessions: SessionManager;

  constructor(users: IUserRepository, sessions: SessionManager) {
    this.users = users;
    this.sessions = sessions;
  }
  
  public async signup(username: string, email: string, password: string) {
    const existing = await this.users.findByUsername(username);
    if (existing) throw new Error('Username already taken');

    const hash = await bcrypt.hash(password, 10);
    const user = await this.users.create({ username, email, passwordHash: hash });
    return this.sessions.createSession(user.id);
  }

  public async login(username: string, password: string) {
    const user = await this.users.findByUsername(username);
    if (!user) throw new Error('User not found');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error('Invalid credentials');

    return this.sessions.createSession(user.id);
  }
}
