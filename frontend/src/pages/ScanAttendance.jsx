import { useState } from 'react';
import Layout from '../components/Layout.jsx';
import QRScanner from '../components/QRScanner.jsx';
import Notice from '../components/Notice.jsx';
import { api } from '../services/api.js';

export default function ScanAttendance() {
  const [result, setResult] = useState(null); // {type, text}
  const [busy, setBusy] = useState(false);

  const onScan = async (token) => {
    setBusy(true);
    try {
      const r = await api.post('/attendance/mark', { token });
      setResult({ type: 'success', text: `${r.message} Time: ${r.record.time} UTC.` });
    } catch (err) { setResult({ type: 'error', text: err.message }); }
    finally { setBusy(false); }
  };

  return (
    <Layout title="Scan attendance">
      <section className="card narrow">
        {result ? (
          <>
            <Notice type={result.type}>{result.text}</Notice>
            <button className="btn primary block" onClick={() => setResult(null)}>Scan another code</button>
          </>
        ) : (
          <>
            <p className="muted">Point your camera at the QR code your teacher is showing.</p>
            <QRScanner onScan={onScan} paused={!!result || busy} />
            {busy && <p className="muted">Marking attendance…</p>}
          </>
        )}
      </section>
    </Layout>
  );
}
