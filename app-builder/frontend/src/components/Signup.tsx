// © 2025 Preston Willis. All rights reserved.
import React, { useState } from 'react';
import { signup } from '../api';
import { setToken } from '../api';

export default function Signup({ onSignup }: { onSignup: () => void }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res: any = await signup(username, email, password);
      setToken(res.token);
      onSignup();
    } catch (err: any) {
      setErr(err.message);
    }
  }

  return (
    <form onSubmit={submit} className="card">
      {err ? <div className="text-red-500 text-sm mb-2">{err}</div> : null}
      <div className="grid gap-2">
        <input className="border rounded-md px-3 py-2 text-sm" placeholder="username" value={username} onChange={e => setUsername(e.target.value)} />
        <input className="border rounded-md px-3 py-2 text-sm" placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="border rounded-md px-3 py-2 text-sm" placeholder="password" value={password} onChange={e => setPassword(e.target.value)} type="password" />
        <button className="btn" type="submit">Sign up</button>
      </div>
    </form>
  );
}
