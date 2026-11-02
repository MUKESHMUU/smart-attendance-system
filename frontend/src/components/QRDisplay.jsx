import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// The QR contains ONLY the random session token. Nothing sensitive.
export default function QRDisplay({ token, size = 320 }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    QRCode.toDataURL(token, { width: size, margin: 2, errorCorrectionLevel: 'M' }).then(setSrc);
  }, [token, size]);
  return src ? <img className="qr" src={src} width={size} height={size} alt="Attendance QR code" /> : <div className="qr placeholder" />;
}
