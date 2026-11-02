import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

// Opens the camera and calls onScan(text) once per code. Also offers "scan from a photo" as a fallback.
export default function QRScanner({ onScan, paused }) {
  const regionId = 'qr-region';
  const scanner = useRef(null);
  const handled = useRef(false);
  const cb = useRef(onScan);
  cb.current = onScan;
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const s = new Html5Qrcode(regionId);
    scanner.current = s;
    s.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      (text) => { if (!handled.current) { handled.current = true; cb.current(text); } },
      () => {}
    )
      .then(() => !cancelled && setStarting(false))
      .catch(() => {
        if (!cancelled) {
          setStarting(false);
          setError('Camera unavailable. Allow camera access in your browser (camera needs HTTPS or localhost), or scan from a photo below.');
        }
      });
    return () => {
      cancelled = true;
      const stop = () => { try { s.clear(); } catch { /* ignore */ } };
      s.isScanning ? s.stop().then(stop).catch(stop) : stop();
    };
  }, []);

  useEffect(() => { if (!paused) handled.current = false; }, [paused]);

  const fromFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const reader = new Html5Qrcode('qr-file-region');
      const text = await reader.scanFile(file, false);
      handled.current = true; cb.current(text);
    } catch { setError('No QR code found in that photo. Try a clearer picture.'); }
    e.target.value = '';
  };

  return (
    <div>
      <div id={regionId} className="scanner" />
      {starting && <p className="muted">Starting camera…</p>}
      {error && <div className="notice error">{error}</div>}
      <label className="btn ghost file-btn">Scan from a photo<input type="file" accept="image/*" onChange={fromFile} hidden /></label>
      <div id="qr-file-region" hidden />
    </div>
  );
}
