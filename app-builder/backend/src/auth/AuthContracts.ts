const USERNAME_PATTERN = /^[A-Za-z0-9_-]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 32;
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

export class AuthValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthValidationError';
  }
}

export class AuthConflictError extends Error {
  constructor() {
    super('Unable to create account with those details.');
    this.name = 'AuthConflictError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid username or password.');
    this.name = 'InvalidCredentialsError';
  }
}

export type SignupCredentials = {
  username: string;
  usernameNormalized: string;
  email: string;
  emailNormalized: string;
  password: string;
};

export type LoginCredentials = {
  username: string;
  password: string;
};

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new AuthValidationError(`${fieldName} is required.`);
  }
  return value;
}

export function normalizeUsername(value: string): string {
  return value.normalize('NFKC').trim();
}

export function normalizeUsernameLookup(value: string): string {
  return normalizeUsername(value).toLocaleLowerCase('en-US');
}

export function normalizeEmail(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('en-US');
}

export function validateSignupCredentials(
  usernameValue: unknown,
  emailValue: unknown,
  passwordValue: unknown,
): SignupCredentials {
  const username = normalizeUsername(requireString(usernameValue, 'Username'));
  const email = normalizeEmail(requireString(emailValue, 'Email'));
  const password = requireString(passwordValue, 'Password');

  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    throw new AuthValidationError(
      `Username must be between ${USERNAME_MIN_LENGTH} and ${USERNAME_MAX_LENGTH} characters.`,
    );
  }
  if (!USERNAME_PATTERN.test(username)) {
    throw new AuthValidationError('Username can contain only letters, numbers, hyphens, and underscores.');
  }
  if (!email || email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
    throw new AuthValidationError('Enter a valid email address.');
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new AuthValidationError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    throw new AuthValidationError(`Password must be no more than ${PASSWORD_MAX_BYTES} bytes.`);
  }

  return {
    username,
    usernameNormalized: normalizeUsernameLookup(username),
    email,
    emailNormalized: email,
    password,
  };
}

export function validateLoginCredentials(usernameValue: unknown, passwordValue: unknown): LoginCredentials {
  const username = normalizeUsername(requireString(usernameValue, 'Username'));
  const password = requireString(passwordValue, 'Password');

  // Login remains permissive enough for accounts created before signup validation existed.
  if (!username || username.length > EMAIL_MAX_LENGTH || !password || Buffer.byteLength(password, 'utf8') > 1024) {
    throw new InvalidCredentialsError();
  }

  return {
    username,
    password,
  };
}

export function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}
