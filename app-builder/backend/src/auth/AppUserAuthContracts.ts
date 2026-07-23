import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  normalizeEmail,
} from './AuthContracts.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const APP_USER_DISPLAY_NAME_MAX_LENGTH = 80;

export class AppUserAuthValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppUserAuthValidationError';
  }
}

export class AppUserAuthConflictError extends Error {
  constructor() {
    super('Unable to create an account with those details.');
    this.name = 'AppUserAuthConflictError';
  }
}

export class InvalidAppUserCredentialsError extends Error {
  constructor() {
    super('Invalid email or password.');
    this.name = 'InvalidAppUserCredentialsError';
  }
}

export type AppUserSignupCredentials = {
  displayName: string;
  email: string;
  emailNormalized: string;
  password: string;
};

export type AppUserLoginCredentials = {
  email: string;
  emailNormalized: string;
  password: string;
};

export function validateAppUserSignup(
  displayNameValue: unknown,
  emailValue: unknown,
  passwordValue: unknown,
): AppUserSignupCredentials {
  const displayName = optionalString(displayNameValue).normalize('NFKC').trim();
  if (displayName.length > APP_USER_DISPLAY_NAME_MAX_LENGTH) {
    throw new AppUserAuthValidationError(
      `Display name must be ${APP_USER_DISPLAY_NAME_MAX_LENGTH} characters or fewer.`,
    );
  }

  const credentials = validateAppUserLogin(emailValue, passwordValue);
  return {
    displayName,
    ...credentials,
  };
}

export function validateAppUserLogin(
  emailValue: unknown,
  passwordValue: unknown,
): AppUserLoginCredentials {
  const email = normalizeEmail(requireString(emailValue, 'Email'));
  const password = requireString(passwordValue, 'Password');

  if (!email || email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
    throw new AppUserAuthValidationError('Enter a valid email address.');
  }

  const passwordBytes = Buffer.byteLength(password, 'utf8');
  if (password.length < PASSWORD_MIN_LENGTH || passwordBytes > PASSWORD_MAX_BYTES) {
    throw new AppUserAuthValidationError(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters and no more than ${PASSWORD_MAX_BYTES} bytes.`,
    );
  }

  return {
    email,
    emailNormalized: email,
    password,
  };
}

export function isDuplicateAppUserError(error: unknown): boolean {
  return Boolean(
    error
    && typeof error === 'object'
    && 'code' in error
    && error.code === 11000,
  );
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new AppUserAuthValidationError(`${fieldName} is required.`);
  }
  return value;
}

function optionalString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
