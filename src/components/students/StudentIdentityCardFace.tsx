import { ShieldCheck } from 'lucide-react';

export type StudentIdentityCardData = {
  studentName: string; studentCode: string; documentNumber: string; className?: string | null;
  academicYear?: string | null; identityNumber?: string | null; issueDate: string; expiryDate?: string | null;
  schoolName: string; schoolPhone?: string | null; logoUrl?: string | null; photoUrl?: string | null;
  status: string; verifyUrl: string;
};
const date = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—';

/** One scalable, print-safe face. No 3-D transforms or hidden duplicate content. */
export function StudentIdentityCardFace({ data, side, qr }: { data: StudentIdentityCardData; side: 'front' | 'back'; qr: string }) {
  const initials = data.studentName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('');
  return (
    <div className="relative h-full w-full overflow-hidden bg-white text-slate-950 [container-type:inline-size]" data-card-side={side}>
      {data.status !== 'ACTIVE' && <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"><span className="-rotate-[25deg] font-black tracking-widest text-red-600/25 [font-size:10cqw]">{data.status}</span></div>}
      {side === 'front' ? <>
        <div className="absolute inset-x-0 top-0 h-[34%] bg-[#0b293b] px-[7%] pt-[7%] text-white">
          <div className="flex items-center gap-[4%]">
            <div className="flex aspect-square w-[17%] shrink-0 items-center justify-center rounded-md bg-white p-[1.5%] font-bold text-[#0b293b] [font-size:6cqw]">{data.logoUrl ? <img src={data.logoUrl} alt="School logo" className="h-full w-full object-contain" /> : data.schoolName[0]}</div>
            <div className="min-w-0"><p className="font-bold uppercase leading-snug tracking-wide [font-size:3.5cqw]">{data.schoolName}</p><p className="mt-1 uppercase tracking-[0.16em] text-white/75 [font-size:2.5cqw]">Student identity card</p></div>
          </div>
        </div>
        <div className="absolute left-1/2 top-[22%] h-[31%] w-[43%] -translate-x-1/2 overflow-hidden rounded-lg border-[3px] border-white bg-slate-100">{data.photoUrl ? <img src={data.photoUrl} alt={`${data.studentName} profile`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center font-bold text-slate-500 [font-size:12cqw]">{initials}</div>}</div>
        <div className="absolute inset-x-[7%] top-[56%] text-center"><p className="break-words font-bold leading-tight [font-size:5.5cqw]">{data.studentName}</p><p className="mt-[3%] font-mono font-semibold tracking-wide text-[#0b293b] [font-size:4cqw]">{data.studentCode}</p></div>
        <div className="absolute inset-x-[7%] top-[69%] grid grid-cols-6 gap-[3%]"><Detail label="Class" value={data.className} /><Detail label="Academic year" value={data.academicYear} /><Detail label="ID number" value={data.identityNumber} /><Detail label="Issued" value={date(data.issueDate)} wide /><Detail label="Valid through" value={date(data.expiryDate)} wide /></div>
        <div className="absolute inset-x-[7%] bottom-[6%] flex justify-center gap-1 font-semibold uppercase tracking-wider [font-size:2.8cqw]" style={{ color: data.status === 'ACTIVE' ? '#047857' : '#b91c1c' }}><ShieldCheck className="size-[4cqw]" />{data.status === 'ACTIVE' ? 'Active student' : data.status}</div>
      </> : <>
        <div className="absolute inset-x-0 top-0 h-[22%] bg-[#0b293b] px-[8%] pt-[8%] text-center text-white"><ShieldCheck className="mx-auto size-[9cqw]" /><p className="mt-[3%] font-semibold uppercase tracking-wider [font-size:3.7cqw]">Secure verification</p><p className="mt-[2%] text-white/75 [font-size:3cqw]">Confirm this card’s current status</p></div>
        <div className="absolute inset-x-[8%] top-[27%] text-center"><div className="mx-auto aspect-square w-[61%] bg-white p-[2%]">{qr ? <img src={qr} alt="Student card verification QR code" className="h-full w-full object-contain" /> : <span className="text-slate-500 [font-size:3cqw]">Loading verification code…</span>}</div><p className="mt-[4%] font-semibold uppercase tracking-widest [font-size:4cqw]">Scan to verify</p><p className="mt-[2%] break-all font-mono text-slate-600 [font-size:2.6cqw]">{data.verifyUrl}</p><div className="mt-[5%] border-t border-slate-200 pt-[4%] text-left"><p className="font-semibold uppercase tracking-wide text-slate-500 [font-size:2.7cqw]">If found, please return to</p><p className="mt-[2%] font-semibold [font-size:3.2cqw]">{data.schoolName}</p><p className="mt-[2%] text-slate-600 [font-size:3cqw]">{data.schoolPhone || 'Contact the school office'}</p></div></div>
      </>}
      <div className="absolute inset-x-[7%] bottom-[2%] border-t border-slate-200 pt-[2%] text-center font-mono text-slate-500 [font-size:2.5cqw]">{side === 'front' ? data.documentNumber : 'School property · Non-transferable'}</div>
    </div>
  );
}
function Detail({ label, value, wide }: { label: string; value?: string | null; wide?: boolean }) {
  return <div className={`${wide ? 'col-span-3' : 'col-span-2'} min-w-0 border-t border-slate-200 pt-[8%]`}><p className="text-slate-500 [font-size:2.5cqw]">{label}</p><p className="mt-1 break-words font-semibold leading-tight [font-size:3cqw]">{value || '—'}</p></div>;
}
