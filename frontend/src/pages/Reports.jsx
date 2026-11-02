import { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout.jsx';
import Notice from '../components/Notice.jsx';
import { api, qs } from '../services/api.js';

export default function Reports() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({ classId: '', studentId: '', subject: '', from: '', to: '' });
  const [error, setError] = useState('');

  useEffect(() => { api.get('/classes').then(setClasses).catch(() => {}); }, []);
  useEffect(() => { api.get('/students' + qs({ classId: f.classId })).then(setStudents).catch(() => {}); }, [f.classId]);
  const load = useCallback(() => { api.get('/reports/attendance' + qs(f)).then(setRows).catch((e) => setError(e.message)); }, [f]);
  useEffect(load, [load]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value, ...(k === 'classId' ? { subject: '', studentId: '' } : {}) });
  const subjects = classes.find((c) => c.id === f.classId)?.subjects || [];

  const download = async () => {
    try {
      const blob = await api.blob('/reports/attendance/export' + qs(f));
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: 'attendance-report.csv' });
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (err) { setError(err.message); }
  };

  return (
    <Layout title="Attendance reports" actions={<button className="btn primary" onClick={download}>Download CSV</button>}>
      <Notice>{error}</Notice>
      <div className="toolbar">
        <select value={f.classId} onChange={set('classId')}><option value="">All classes</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.className}</option>)}</select>
        <select value={f.subject} onChange={set('subject')} disabled={!f.classId}><option value="">All subjects</option>{subjects.map((s) => <option key={s}>{s}</option>)}</select>
        <select value={f.studentId} onChange={set('studentId')}><option value="">All students</option>{students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <label className="inline">From <input type="date" value={f.from} onChange={set('from')} /></label>
        <label className="inline">To <input type="date" value={f.to} onChange={set('to')} /></label>
      </div>
      <section className="card table-wrap">
        {rows.length === 0 ? <p className="muted">No students match these filters.</p> : (
          <table><thead><tr><th>Student</th><th>Roll</th><th>Class</th><th>Total</th><th>Attended</th><th>Missed</th><th>Attendance</th></tr></thead><tbody>
            {rows.map((r) => (
              <tr key={r.studentId}><td>{r.name}</td><td>{r.rollNumber}</td><td>{r.className}</td><td>{r.totalClasses}</td><td>{r.attended}</td><td>{r.missed}</td>
                <td><span className={`pill ${r.totalClasses === 0 ? '' : r.percentage < 75 ? 'bad' : 'good'}`}>{r.percentage}%</span></td></tr>
            ))}
          </tbody></table>
        )}
      </section>
      <p className="muted small">Attendance % = classes attended ÷ classes conducted × 100. A class counts as conducted once its session is closed or expired.</p>
    </Layout>
  );
}
