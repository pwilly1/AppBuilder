import React, { useState } from 'react';
// © 2025 Preston Willis. All rights reserved.
import { login, setToken } from '../api';

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res: any = await login(username, password);
      setToken(res.token);
      onLogin();
    } catch (err: any) {
      setErr(err.message);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      {err ? <div className="rounded-2xl border border-red-300/35 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div> : null}
      <div className="grid gap-3">
        <input className="field-input" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        <input className="field-input" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} type="password" />
        <button className="btn w-full" type="submit">Log in</button>
      </div>
    </form>
  );
}
