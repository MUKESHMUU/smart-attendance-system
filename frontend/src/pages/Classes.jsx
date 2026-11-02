import { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import Notice from '../components/Notice.jsx';
import { api } from '../services/api.js';

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [viewing, setViewing] = useState(null);
  const [roster, setRoster] = useState([]);

  const load = useCallback(() => { api.get('/classes').then(setClasses).catch((e) => setMsg({ type: 'error', text: e.message })); }, []);
  useEffect(load, [load]);

  const open = (c) => {
    setFormError(''); setEditingId(c ? c.id : null);
    setForm(c ? { className: c.className, subjects: c.subjects.join(', ') } : { className: '', subjects: '' });
  };

  const save = async (e) => {
    e.preventDefault(); setFormError('');
    if (form.className.trim().length < 2) return setFormError('Enter a class name.');
    if (!form.subjects.split(',').some((s) => s.trim())) return setFormError('Add at least one subject, separated by commas.');
    try {
      editingId ? await api.put(`/classes/${editingId}`, form) : await api.post('/classes', form);
      setForm(null); setMsg({ type: 'success', text: editingId ? 'Class updated.' : 'Class created.' }); load();
    } catch (err) { setFormError(err.message); }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete ${c.className}?`)) return;
    try { await api.del(`/classes/${c.id}`); setMsg({ type: 'success', text: 'Class deleted.' }); load(); }
    catch (err) { setMsg({ type: 'error', text: err.message }); }
  };

  const view = async (c) => {
    if (viewing === c.id) return setViewing(null);
    setViewing(c.id);
    setRoster(await api.get(`/students?classId=${c.id}`).catch(() => []));
  };

  return (
    <Layout title="Classes" actions={<button className="btn primary" onClick={() => open(null)}>Create class</button>}>
      <Notice type={msg.type} onClose={() => setMsg({ type: '', text: '' })}>{msg.text}</Notice>
      {classes.length === 0 && <section className="card"><p className="muted">No classes yet. Create one, then add students to it.</p></section>}
      <div className="grid cards">
        {classes.map((c) => (
          <section className="card" key={c.id}>
            <h2>{c.className}</h2>
            <p className="muted">{c.studentCount} student(s)</p>
            <div className="chips">{c.subjects.map((s) => <span className="chip" key={s}>{s}</span>)}</div>
            <div className="row-actions">
              <button className="btn small" onClick={() => view(c)}>{viewing === c.id ? 'Hide students' : 'View students'}</button>
              <button className="btn small" onClick={() => open(c)}>Edit</button>
              <button className="btn small danger" onClick={() => remove(c)}>Delete</button>
            </div>
            {viewing === c.id && (roster.length === 0 ? <p className="muted">No students in this class.</p> :
              <ul className="plain">{roster.map((s) => <li key={s.id}>{s.rollNumber} · {s.name}</li>)}</ul>)}
          </section>
        ))}
      </div>
      {form && (
        <Modal title={editingId ? 'Edit class' : 'Create class'} onClose={() => setForm(null)}>
          <form onSubmit={save} noValidate>
            <Notice>{formError}</Notice>
            <label>Class name<input value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} placeholder="e.g. CS-A Semester 4" /></label>
            <label>Subjects (comma-separated)<input value={form.subjects} onChange={(e) => setForm({ ...form, subjects: e.target.value })} placeholder="Mathematics, Physics, Databases" /></label>
            <p className="muted small">Assign students to this class from the Students page.</p>
            <div className="form-actions"><button type="button" className="btn" onClick={() => setForm(null)}>Cancel</button><button className="btn primary">Save class</button></div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
