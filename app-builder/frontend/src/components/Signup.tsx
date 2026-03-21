// © 2025 Preston Willis. All rights reserved.
import React, { useMemo, useState } from 'react';
import { signup, setToken } from '../api';

type Props = {
  onSignup: () => void;
  onSwitchMode?: () => void;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidUsername(value: string) {
  return value.trim().length >= 3;
}

export default function Signup({ onSignup, onSwitchMode }: Props) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validationMessage = useMemo(() => {
    if (!username && !email && !password) return '';
    if (!isValidUsername(username)) return 'Username must be at least 3 characters.';
    if (!isValidEmail(email)) return 'Enter a valid email address.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    return '';
  }, [email, password, username]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (validationMessage) {
      setErr(validationMessage);
      return;
    }

    try {
      setSubmitting(true);
      setErr(null);
      const res: any = await signup(username.trim(), email.trim(), password);
      setToken(res.token);
      onSignup();
    } catch (error: any) {
      setErr(error.message || 'Unable to create account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      {err ? <div className="rounded-2xl border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">{err}</div> : null}

      <div className="grid gap-3">
        <label className="grid gap-2">
          <span className="field-label">Username</span>
          <input
            className="field-input !bg-white !text-slate-900"
            placeholder="your-username"
            autoComplete="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (err) setErr(null);
            }}
          />
        </label>

        <label className="grid gap-2">
          <span className="field-label">Email</span>
          <input
            className="field-input !bg-white !text-slate-900"
            placeholder="you@business.com"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (err) setErr(null);
            }}
            type="email"
          />
        </label>

        <label className="grid gap-2">
          <span className="field-label">Password</span>
          <div className="relative">
            <input
              className="field-input !bg-white !pr-12 !text-slate-900"
              placeholder="Choose a secure password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (err) setErr(null);
              }}
              type={showPassword ? 'text' : 'password'}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 hover:text-slate-800"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>
      </div>

      <button className="btn w-full disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={submitting}>
        {submitting ? 'Creating account...' : 'Create account'}
      </button>

      <div className="flex items-center justify-between gap-3 text-xs text-white/60">
        <span>Account creation signs you straight into the builder.</span>
        {onSwitchMode ? (
          <button type="button" className="auth-link" onClick={onSwitchMode}>
            Already have an account?
          </button>
        ) : null}
      </div>
    </form>
  );
}
