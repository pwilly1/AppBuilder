import bcrypt from 'bcryptjs';
import type { IUserRepository } from '../repositories/UserRepository.js';
import { SessionManager } from './SessionManager.js';

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
    // create a normal (non-guest) user
    const user = await this.users.create({ username, email, passwordHash: hash, isGuest: false } as any);
    return this.sessions.createSession((user as any).id ?? (user as any)._id?.toString?.());
  }
  // Will fix this later
  public async guest(){
    // create a transient guest user record and return a session token for it
    const unique = `guest_${Date.now()}_${Math.floor(Math.random()*10000)}`;
    const username = unique;
    const email = `${unique}@guest.local`;
    // create a random password hash so schema validation passes
    const pw = Math.random().toString(36).slice(2);
    const hash = await bcrypt.hash(pw, 8);
    const user = await this.users.create({ username, email, passwordHash: hash, isGuest: true } as any);
    // user may be a mongoose document; normalize id
    const userId = (user as any).id ?? (user as any)._id?.toString?.();
    return this.sessions.createSession(userId);
  }

  public async login(username: string, password: string) {
    const user = await this.users.findByUsername(username);
    if (!user) throw new Error('User not found');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error('Invalid credentials');

    return this.sessions.createSession(user.id);
  }
}
