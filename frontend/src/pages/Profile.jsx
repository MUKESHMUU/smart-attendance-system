import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import Notice from '../components/Notice.jsx';
import { fetchMe } from '../services/authService.js';

export default function Profile() {
  const [me, setMe] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { fetchMe().then(setMe).catch((e) => setError(e.message)); }, []);
  const rows = me ? [['Name', me.name], ['Role', me.role], ['Username', me.username], ['Email', me.email],
    ...(me.student ? [['Roll number', me.student.rollNumber], ['Class', me.student.className]] : [])] : [];
  return (
    <Layout title="Profile">
      <Notice>{error}</Notice>
      <section className="card narrow">
        <dl className="details">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      </section>
    </Layout>
  );
}
