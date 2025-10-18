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
    <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
      {err ? <div style={{ color: 'red' }}>{err}</div> : null}
      <input placeholder="username" value={username} onChange={e => setUsername(e.target.value)} />
      <input placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
      <input placeholder="password" value={password} onChange={e => setPassword(e.target.value)} type="password" />
      <button type="submit">Sign up</button>
    </form>
  );
}
