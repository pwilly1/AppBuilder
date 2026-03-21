import React, { useMemo, useState } from 'react';
// © 2025 Preston Willis. All rights reserved.
import { login, setToken } from '../api';

type Props = {
  onLogin: () => void;
  onSwitchMode?: () => void;
};

function isValidUsername(value: string) {
  return value.trim().length >= 3;
}

export default function Login({ onLogin, onSwitchMode }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validationMessage = useMemo(() => {
    if (!username && !password) return '';
    if (!isValidUsername(username)) return 'Enter a valid username.';
    if (!password.trim()) return 'Password is required.';
    return '';
  }, [username, password]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (validationMessage) {
      setErr(validationMessage);
      return;
    }

    try {
      setSubmitting(true);
      setErr(null);
      const res: any = await login(username.trim(), password);
      setToken(res.token);
      onLogin();
    } catch (error: any) {
      setErr(error.message || 'Unable to sign in.');
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
          <span className="field-label">Password</span>
          <div className="relative">
            <input
              className="field-input !bg-white !pr-12 !text-slate-900"
              placeholder="Enter your password"
              autoComplete="current-password"
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
        {submitting ? 'Signing in...' : 'Sign in'}
      </button>

      <div className="flex items-center justify-between gap-3 text-xs text-white/60">
        <span>Secure account access for your builder projects.</span>
        {onSwitchMode ? (
          <button type="button" className="auth-link" onClick={onSwitchMode}>
            Need an account?
          </button>
        ) : null}
      </div>
    </form>
  );
}
