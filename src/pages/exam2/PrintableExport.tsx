import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { apiGet } from '../../lib/api';
import QRCode from 'qrcode';
import { Printer, KeyRound } from 'lucide-react';

/** Printable exam export. Builds a branded, print-ready sheet with a candidate
 *  ID block, QR code and answer sheet; supports A/B/C versions and answer keys. */
export default function PrintableExport() {
  const { examId } = useParams();
  const [version, setVersion] = useState('A');
  const [answerKey, setAnswerKey] = useState(false);
  const [data, setData] = useState<any>(null);
  const [qr, setQr] = useState('');

  useEffect(() => {
    apiGet(`/api/exams/${examId}/print?version=${version}&answerKey=${answerKey ? '1' : '0'}`).then(async (d) => {
      setData(d);
      setQr(await QRCode.toDataURL(`${window.location.origin}/exam2/${examId}/print?version=${version}`, { width: 96, margin: 1 }));
    }).catch(() => setData(null));
  }, [examId, version, answerKey]);

  if (!data) return <div className="py-20 text-center text-slate-500">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-5 print:hidden">
        <select className="h-10 rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas px-3 text-sm" value={version} onChange={(e) => setVersion(e.target.value)}>
          {['A', 'B', 'C'].map((v) => <option key={v} value={v}>Version {v}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={answerKey} onChange={(e) => setAnswerKey(e.target.checked)} /> <KeyRound className="h-4 w-4" /> Answer key</label>
        <Button className="ml-auto bg-primary text-primary-foreground" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print / PDF</Button>
      </div>

      <div className="bg-white text-slate-900 p-8 rounded-xl border border-slate-200 print:border-0 print:p-0" id="print-area">
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-6">
          <div className="flex items-center gap-3">
            {data.school?.logoUrl && <img src={data.school.logoUrl} alt="" className="h-12 w-12 object-contain" />}
            <div>
              <h1 className="text-xl font-black">{data.school?.name || 'MRLC'}</h1>
              <p className="text-sm font-bold">{data.exam.title} {answerKey && <span className="text-red-600">— ANSWER KEY</span>}</p>
              <p className="text-xs text-slate-500">{data.exam.subject} · {data.exam.class} · Version {data.version} · {data.exam.durationMinutes ?? '—'} min · {data.exam.totalMarks ?? '—'} marks</p>
            </div>
          </div>
          {qr && <img src={qr} alt="verify" className="h-20 w-20" />}
        </div>

        {/* Candidate identification */}
        {!answerKey && (
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div className="border border-slate-300 rounded p-3">Candidate Name: ___________________________</div>
            <div className="border border-slate-300 rounded p-3">Candidate ID: ___________________________</div>
            <div className="border border-slate-300 rounded p-3">Class: ___________________________</div>
            <div className="border border-slate-300 rounded p-3">Date: ___________________________</div>
          </div>
        )}

        {data.sections?.length > 0 && data.sections.map((s: any) => (
          <p key={s.id} className="text-sm font-bold mt-4">{s.title}{s.instructions ? ` — ${s.instructions}` : ''}</p>
        ))}

        <ol className="space-y-5 mt-4">
          {data.questions.map((q: any) => (
            <li key={q.id} className="break-inside-avoid">
              <p className="font-medium"><span className="font-bold mr-2">{q.number}.</span>{q.text} <span className="text-xs text-slate-400">({q.points} pts)</span></p>
              {Array.isArray(q.options) && q.options.length > 0 && (
                <ol className="ml-8 mt-1 space-y-1 text-sm" type="A">
                  {q.options.map((o: any, i: number) => <li key={i}>{String(typeof o === 'object' ? o.text ?? o.value : o)}</li>)}
                </ol>
              )}
              {answerKey && (q.correctAnswer != null || q.correctAnswers) && (
                <p className="ml-8 text-sm text-red-600 font-semibold mt-1">Answer: {q.correctAnswer ?? (Array.isArray(q.correctAnswers) ? q.correctAnswers.join(' / ') : '')}</p>
              )}
              {!answerKey && (!Array.isArray(q.options) || !q.options.length) && <div className="ml-8 mt-2 border-b border-slate-300 h-12" />}
            </li>
          ))}
        </ol>
      </div>

      <style>{`@media print { body * { visibility: hidden; } #print-area, #print-area * { visibility: visible; } #print-area { position: absolute; left: 0; top: 0; width: 100%; } @page { size: A4; margin: 14mm; } }`}</style>
    </div>
  );
}
