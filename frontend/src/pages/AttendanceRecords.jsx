import { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout.jsx';
import Notice from '../components/Notice.jsx';
import { api, qs } from '../services/api.js';

export default function AttendanceRecords() {
  const [classes, setClasses] = useState([]);
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({ classId: '', subject: '', date: '', status: '', search: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => { api.get('/classes').then(setClasses).catch(() => {}); }, []);
  const load = useCallback(() => { api.get('/attendance' + qs(f)).then(setRows).catch((e) => setMsg({ type: 'error', text: e.message })); }, [f]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value, ...(k === 'classId' ? { subject: '' } : {}) });
  const subjects = classes.find((c) => c.id === f.classId)?.subjects || [];

  const flip = async (r) => {
    const status = r.status === 'present' ? 'absent' : 'present';
    if (!window.confirm(`Mark ${r.studentName} as ${status} for ${r.subject} on ${r.date}?`)) return;
    try { await api.put('/attendance/correct', { sessionId: r.sessionId, studentId: r.studentId, status }); setMsg({ type: 'success', text: 'Attendance corrected.' }); load(); }
    catch (err) { setMsg({ type: 'error', text: err.message }); }
  };

  return (
    <Layout title="Attendance records">
      <Notice type={msg.type} onClose={() => setMsg({ type: '', text: '' })}>{msg.text}</Notice>
      <div className="toolbar">
        <input placeholder="Search name or roll number" value={f.search} onChange={set('search')} />
        <select value={f.classId} onChange={set('classId')}><option value="">All classes</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.className}</option>)}</select>
        <select value={f.subject} onChange={set('subject')} disabled={!f.classId}><option value="">All subjects</option>{subjects.map((s) => <option key={s}>{s}</option>)}</select>
        <input type="date" value={f.date} onChange={set('date')} aria-label="Date" />
        <select value={f.status} onChange={set('status')}><option value="">Present and absent</option><option value="present">Present</option><option value="absent">Absent</option></select>
      </div>
      <section className="card table-wrap">
        {rows.length === 0 ? <p className="muted">No records match. Finished sessions appear here.</p> : (
          <table><thead><tr><th>Date</th><th>Time</th><th>Student</th><th>Roll</th><th>Class</th><th>Subject</th><th>Status</th><th></th></tr></thead><tbody>
            {rows.map((r) => (
              <tr key={`${r.sessionId}-${r.studentId}`}><td>{r.date}</td><td>{r.time}</td><td>{r.studentName}</td><td>{r.rollNumber}</td><td>{r.className}</td><td>{r.subject}</td>
                <td><span className={`pill ${r.status === 'present' ? 'good' : 'bad'}`}>{r.status}</span>{r.method === 'teacher-correction' && <small className="muted"> corrected</small>}</td>
                <td><button className="btn small" onClick={() => flip(r)}>Mark {r.status === 'present' ? 'absent' : 'present'}</button></td></tr>
            ))}
          </tbody></table>
        )}
      </section>
    </Layout>
  );
}
