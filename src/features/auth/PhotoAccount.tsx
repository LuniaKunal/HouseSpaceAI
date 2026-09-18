import React, { useEffect, useState } from 'react';
import { supabase } from './client';

export function PhotoAccount({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<string | null>();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [signup, setSignup] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => { if (alive) { setUser(data.session?.user.id || null); if (error) setError('Unable to restore your session. Sign in again.'); } });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user.id || null); });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);
  if (!supabase) return <>{children}</>;
  if (user === undefined) return <main className="photo-page p-8" role="status">Opening your photo library…</main>;
  if (user) return <div className="flex flex-col min-h-0 h-full"><div className="photo-account-bar"><span>Private photo library</span><button disabled={busy} onClick={async () => { setBusy(true); const { error } = await supabase!.auth.signOut(); if (error) setError(error.message); setBusy(false); }}>Sign out</button>{error && <span role="alert">{error}</span>}</div><React.Fragment key={user}>{children}</React.Fragment></div>;
  return <main className="photo-page overflow-auto"><section className="photo-auth">
    <a href="/">HouseSpace</a><h1>{signup ? 'Create your account' : 'Your room ideas, together.'}</h1>
    <p>Sign in to save your photos and concepts in your private library. The home planner is still available without an account.</p>
    <form onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError(''); setMessage('');
      try {
        const result = signup ? await supabase!.auth.signUp({ email, password }) : await supabase!.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        setPassword(''); if (signup && !result.data.session) setMessage('Check your email to confirm your account, then sign in.');
      } catch (error) { setError(error instanceof Error ? error.message : 'Unable to sign in. Try again.'); }
      finally { setBusy(false); }
    }}>
      <label htmlFor="photo-email">Email</label><input id="photo-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} />
      <label htmlFor="photo-password">Password</label><input id="photo-password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={event => setPassword(event.target.value)} />
      {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
      <button className="photo-primary" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</button>
    </form>
    <button disabled={busy} onClick={() => { setSignup(!signup); setError(''); setMessage(''); }}>{signup ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>
    <a href="/projects">Continue to the free home planner</a>
  </section></main>;
}
