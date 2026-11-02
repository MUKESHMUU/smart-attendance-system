import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Notice from '../components/Notice.jsx';

export default function Login() {
  const { user, signIn } = useAuth();
  const nav = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={user.role === 'teacher' ? '/teacher' : '/student'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password) return setError('Enter your email or username and your password.');
    setBusy(true);
    try {
      const u = await signIn(identifier.trim(), password);
      nav(u.role === 'teacher' ? '/teacher' : '/student');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="login-wrap">
      <div className="login-art" aria-hidden="true">
        <div className="chalk">Present.</div>
        <div className="chalk faded">Present.</div>
        <div className="chalk faded2">Absent.</div>
      </div>
      <form className="login-card" onSubmit={submit} noValidate>
        <h1>Sign in</h1>
        <p className="muted">Teachers and students use the same page.</p>
        <Notice>{error}</Notice>
        <label>Email or username
          <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" autoFocus />
        </label>
        <label>Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        <button className="btn primary block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="muted small">Students sign in with their roll number or email and the password their teacher gave them.</p>
      </form>
    </div>
  );
}
