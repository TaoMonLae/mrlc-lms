import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Loader2, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';

type PersonnelVerification = {
  valid: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  cardNumber: string;
  cardType: string;
  holderName: string;
  roleTitle: string;
  organizationUnit: string;
  issueDate: string;
  expiryDate: string;
  school: {
    name: string;
    logoUrl?: string | null;
    contactPhone?: string | null;
  };
};

const formatDate = (value?: string | null) => value
  ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  : '—';

export default function VerifyPersonnelCard() {
  const { token } = useParams();
  const [result, setResult] = useState<PersonnelVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setNotFound(false);
    fetch(`/api/verify/personnel/${token}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) { setNotFound(true); return; }
        setResult(await response.json());
      })
      .catch((error) => { if (error?.name !== 'AbortError') setNotFound(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 font-sans">
      <section className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="flex items-center gap-3 bg-slate-900 px-6 py-5 text-white">
          {result?.school.logoUrl ? <img src={result.school.logoUrl} alt="" className="size-10 rounded bg-white/10 object-contain p-1" />
            : <span className="flex size-10 items-center justify-center rounded bg-white/10 font-bold">{(result?.school.name || 'S')[0]}</span>}
          <span><span className="block text-sm font-bold uppercase tracking-wide">{result?.school.name || 'Personnel Card Verification'}</span><span className="block text-[11px] text-slate-300">Secure identity verification</span></span>
        </header>

        <div className="p-6">
          {loading && <div className="py-10 text-center text-slate-500"><Loader2 className="mx-auto mb-2 size-6 animate-spin" />Verifying card…</div>}
          {!loading && (notFound || !result) && <div className="py-8 text-center"><ShieldX className="mx-auto mb-3 size-14 text-red-500" /><h1 className="text-lg font-bold text-slate-900">Card Not Found</h1><p className="mt-1 text-sm text-slate-500">No personnel card matches this secure link. It may be invalid or mistyped.</p></div>}
          {!loading && result && <>
            <div className="mb-6 text-center">
              {result.valid ? <><ShieldCheck className="mx-auto mb-2 size-14 text-emerald-500" /><h1 className="text-lg font-bold text-emerald-700">Valid Personnel Card</h1><p className="text-sm text-slate-500">This active identity card was issued by {result.school.name}.</p></>
                : <><ShieldAlert className="mx-auto mb-2 size-14 text-amber-500" /><h1 className="text-lg font-bold text-amber-700">{result.status === 'EXPIRED' ? 'Expired Personnel Card' : 'Inactive Personnel Card'}</h1><p className="text-sm text-slate-500">{result.status === 'EXPIRED' ? 'This card has passed its valid-through date.' : 'This cardholder is no longer marked active.'}</p></>}
            </div>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
              <Row label="Card Number" value={result.cardNumber} mono />
              <Row label="Card Type" value={result.cardType} />
              <Row label="Cardholder" value={result.holderName} />
              <Row label="Role" value={result.roleTitle} />
              <Row label="Faculty / Department" value={result.organizationUnit} />
              <Row label="Issue Date" value={formatDate(result.issueDate)} />
              <Row label="Valid Through" value={formatDate(result.expiryDate)} />
              <Row label="Status" value={result.status} />
              {result.school.contactPhone && <Row label="School Contact" value={result.school.contactPhone} />}
            </div>
            <p className="mt-5 text-center text-[11px] text-slate-400">Only non-sensitive card details are shown. Personal contact, payroll, and school records are never disclosed here.</p>
          </>}
        </div>
      </section>
    </main>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="flex items-start justify-between gap-4 px-4 py-2.5"><span className="shrink-0 text-slate-500">{label}</span><span className={`text-right font-semibold text-slate-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span></div>;
}
