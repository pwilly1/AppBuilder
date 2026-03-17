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
    <form onSubmit={submit} className="grid gap-3">
      {err ? <div className="rounded-2xl border border-red-300/35 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div> : null}
      <div className="grid gap-3">
        <input className="field-input" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        <input className="field-input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="field-input" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} type="password" />
        <button className="btn w-full" type="submit">Sign up</button>
      </div>
    </form>
  );
}
