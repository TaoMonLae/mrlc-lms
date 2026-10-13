import { useEffect, useState } from 'react';

export default function PublicBrandMark({ logoUrl, schoolName }: { logoUrl: string | null; schoolName: string }) {
  const [configuredFailed, setConfiguredFailed] = useState(false);
  const [defaultFailed, setDefaultFailed] = useState(false);
  useEffect(() => { setConfiguredFailed(false); setDefaultFailed(false); }, [logoUrl]);
  const src = logoUrl && !configuredFailed ? logoUrl : defaultFailed ? null : '/icon-192.png';
  return <span className="landing-brand">
    {src ? <img src={src} alt="" width="42" height="42" onError={() => { if (src === logoUrl) setConfiguredFailed(true); else setDefaultFailed(true); }} /> : <span className="landing-brand-fallback" aria-hidden="true">MRLC</span>}
    <span className="landing-brand-copy"><strong>{schoolName}</strong><small>GED School · Malaysia</small></span>
  </span>;
}
