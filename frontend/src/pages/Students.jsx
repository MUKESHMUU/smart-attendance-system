import { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import Notice from '../components/Notice.jsx';
import { api, qs } from '../services/api.js';

const empty = { name: '', rollNumber: '', email: '', classId: '', password: '' };

export default function Students() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [form, setForm] = useState(null); // null = closed
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    api.get('/students' + qs({ search, classId })).then(setStudents).catch((e) => setMsg({ type: 'error', text: e.message }));
  }, [search, classId]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);
  useEffect(() => { api.get('/classes').then(setClasses).catch(() => {}); }, []);

  const open = (s) => {
    setFormError('');
    setEditingId(s ? s.id : null);
    setForm(s ? { name: s.name, rollNumber: s.rollNumber, email: s.email, classId: s.classId, password: '' } : { ...empty, classId: classes[0]?.id || '' });
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setFormError('');
    if (form.name.trim().length < 2) return setFormError('Enter the student name.');
    if (!form.rollNumber.trim()) return setFormError('Enter the roll number.');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setFormError('Enter a valid email address.');
    if (!form.classId) return setFormError('Choose a class. Create one first if the list is empty.');
    if (!editingId && form.password.length < 6) return setFormError('Set an initial password of at least 6 characters.');
    if (editingId && form.password && form.password.length < 6) return setFormError('A new password needs at least 6 characters.');
    try {
      editingId ? await api.put(`/students/${editingId}`, form) : await api.post('/students', form);
      setForm(null);
      setMsg({ type: 'success', text: editingId ? 'Student updated.' : 'Student added.' });
      load();
    } catch (err) { setFormError(err.message); }
  };

  const remove = async (s) => {
    if (!window.confirm(`Delete ${s.name}? Their attendance records are deleted too.`)) return;
    try { await api.del(`/students/${s.id}`); setMsg({ type: 'success', text: 'Student deleted.' }); load(); }
    catch (err) { setMsg({ type: 'error', text: err.message }); }
  };

  return (
    <Layout title="Students" actions={<button className="btn primary" onClick={() => open(null)}>Add student</button>}>
      <Notice type={msg.type} onClose={() => setMsg({ type: '', text: '' })}>{msg.text}</Notice>
      <div className="toolbar">
        <input placeholder="Search by name or roll number" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.className}</option>)}
        </select>
      </div>
      <section className="card table-wrap">
        {students.length === 0 ? <p className="muted">No students found. Add your first student to get started.</p> : (
          <table><thead><tr><th>Name</th><th>Roll no.</th><th>Email</th><th>Class</th><th></th></tr></thead><tbody>
            {students.map((s) => (
              <tr key={s.id}><td>{s.name}</td><td>{s.rollNumber}</td><td>{s.email}</td><td>{s.className}</td>
                <td className="row-actions"><button className="btn small" onClick={() => open(s)}>Edit</button><button className="btn small danger" onClick={() => remove(s)}>Delete</button></td></tr>
            ))}
          </tbody></table>
        )}
      </section>
      {form && (
        <Modal title={editingId ? 'Edit student' : 'Add student'} onClose={() => setForm(null)}>
          <form onSubmit={save} noValidate>
            <Notice>{formError}</Notice>
            <label>Name<input value={form.name} onChange={set('name')} /></label>
            <label>Roll number<input value={form.rollNumber} onChange={set('rollNumber')} /></label>
            <label>Email<input type="email" value={form.email} onChange={set('email')} /></label>
            <label>Class
              <select value={form.classId} onChange={set('classId')}>
                <option value="">Choose a class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.className}</option>)}
              </select>
            </label>
            <label>{editingId ? 'New password (leave blank to keep)' : 'Initial password'}
              <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
            </label>
            <p className="muted small">The student signs in with their roll number or email and this password.</p>
            <div className="form-actions"><button type="button" className="btn" onClick={() => setForm(null)}>Cancel</button><button className="btn primary">Save student</button></div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
