import { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout.jsx';
import QRDisplay from '../components/QRDisplay.jsx';
import Notice from '../components/Notice.jsx';
import { api } from '../services/api.js';

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function StartAttendance() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [subject, setSubject] = useState('');
  const [minutes, setMinutes] = useState(5);
  const [session, setSession] = useState(null);
  const [counts, setCounts] = useState({ presentCount: 0, rosterCount: 0 });
  const [left, setLeft] = useState(0);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const timer = useRef(null);

  useEffect(() => {
    api.get('/classes').then(setClasses).catch((e) => setError(e.message));
    // Resume a running session if the page is reloaded
    api.get('/sessions/active').then((a) => a[0] && setSession(a[0])).catch(() => {});
  }, []);

  const subjects = classes.find((c) => c.id === classId)?.subjects || [];

  useEffect(() => {
    if (!session) return undefined;
    const tick = async () => {
      const remaining = Math.max(0, Math.round((new Date(session.expiresAt) - Date.now()) / 1000));
      setLeft(remaining);
      try {
        const s = await api.get(`/sessions/${session.id}`);
        setCounts({ presentCount: s.presentCount, rosterCount: s.rosterCount });
        if (s.ended && remaining === 0) { setInfo('This session has ended.'); }
      } catch { /* ignore polling errors */ }
    };
    tick();
    timer.current = setInterval(tick, 3000);
    const clock = setInterval(() => setLeft(Math.max(0, Math.round((new Date(session.expiresAt) - Date.now()) / 1000))), 1000);
    return () => { clearInterval(timer.current); clearInterval(clock); };
  }, [session]);

  const start = async (e) => {
    e.preventDefault(); setError(''); setInfo('');
    if (!classId) return setError('Choose a class.');
    if (!subject) return setError('Choose a subject.');
    const m = Number(minutes);
    if (!Number.isInteger(m) || m < 1 || m > 120) return setError('Validity must be a whole number between 1 and 120 minutes.');
    try { setSession(await api.post('/sessions/start', { classId, subject, durationMinutes: m })); }
    catch (err) { setError(err.message); }
  };

  const close = async () => {
    try { await api.post(`/sessions/${session.id}/close`); setSession(null); setInfo('Session closed. Attendance is saved. Students who did not scan are marked absent.'); }
    catch (err) { setError(err.message); }
  };

  const running = session && left > 0;

  return (
    <Layout title="Start attendance">
      <Notice>{error}</Notice>
      <Notice type="success" onClose={() => setInfo('')}>{info}</Notice>
      {!running ? (
        <section className="card narrow">
          <form onSubmit={start} noValidate>
            <label>Class
              <select value={classId} onChange={(e) => { setClassId(e.target.value); setSubject(''); }}>
                <option value="">Choose a class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.className}</option>)}
              </select>
            </label>
            <label>Subject
              <select value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!classId}>
                <option value="">Choose a subject</option>
                {subjects.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label>QR valid for (minutes)
              <input type="number" min="1" max="120" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            </label>
            <button className="btn primary block">Start attendance</button>
          </form>
        </section>
      ) : (
        <section className="card qr-panel">
          <div className="qr-box"><QRDisplay token={session.token} /></div>
          <div className="qr-info">
            <h2>{session.className} · {session.subject}</h2>
            <div className={`countdown ${left < 30 ? 'urgent' : ''}`} aria-live="off">{fmt(left)}</div>
            <p className="muted">Students open <strong>Scan attendance</strong> and point their camera here.</p>
            <p className="big-count"><strong>{counts.presentCount}</strong> of {counts.rosterCount} present</p>
            <button className="btn danger" onClick={close}>Close session</button>
          </div>
        </section>
      )}
    </Layout>
  );
}
