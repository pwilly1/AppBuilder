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
    <form onSubmit={submit} className="card">
      {err ? <div className="text-red-500 text-sm mb-2">{err}</div> : null}
      <div className="grid gap-2">
        <input className="border rounded-md px-3 py-2 text-sm" placeholder="username" value={username} onChange={e => setUsername(e.target.value)} />
        <input className="border rounded-md px-3 py-2 text-sm" placeholder="password" value={password} onChange={e => setPassword(e.target.value)} type="password" />
        <button className="btn" type="submit">Log in</button>
      </div>
    </form>
  );
}
