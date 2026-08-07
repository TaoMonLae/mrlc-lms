import React from 'react';
import {
  BookOpen,
  Briefcase,
  CreditCard,
  FlipHorizontal2,
  Mail,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { apiGet } from '@/src/lib/api';

type PersonnelCardKind = 'TEACHER' | 'STAFF';

type PersonnelIdentityCardProps = {
  kind: PersonnelCardKind;
  name: string;
  code: string;
  photoUrl?: string | null;
  status: string;
  roleTitle: string;
  organizationUnit?: string | null;
  employmentType?: string | null;
  joinedDate?: string | null;
};

type SchoolBranding = {
  name?: string | null;
  shortName?: string | null;
  address?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  logoUrl?: string | null;
};

const cardThemes = {
  TEACHER: {
    label: 'Teacher identity',
    credential: 'Teaching faculty',
    icon: BookOpen,
    shell: 'from-indigo-950 via-slate-900 to-amber-950',
    face: 'from-slate-950 via-indigo-950 to-amber-600',
    accent: 'text-amber-200',
    badge: 'bg-amber-400/15 text-amber-200 hover:bg-amber-400/15',
    dot: 'bg-amber-400',
  },
  STAFF: {
    label: 'Staff identity',
    credential: 'Authorized staff',
    icon: Briefcase,
    shell: 'from-emerald-950 via-slate-900 to-cyan-950',
    face: 'from-slate-950 via-emerald-950 to-cyan-700',
    accent: 'text-emerald-200',
    badge: 'bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/15',
    dot: 'bg-emerald-400',
  },
} as const;

const formatDate = (date?: string | null) => {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const normalizeLabel = (value?: string | null) =>
  value ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : '—';

export function PersonnelIdentityCard({
  kind,
  name,
  code,
  photoUrl,
  status,
  roleTitle,
  organizationUnit,
  employmentType,
  joinedDate,
}: PersonnelIdentityCardProps) {
  const [flipped, setFlipped] = React.useState(false);
  const [branding, setBranding] = React.useState<SchoolBranding>({});
  const theme = cardThemes[kind];
  const RoleIcon = theme.icon;
  const active = status.toUpperCase() === 'ACTIVE';
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  const schoolName = branding.name || branding.shortName || 'School';

  React.useEffect(() => {
    const controller = new AbortController();
    apiGet<SchoolBranding>('/api/settings', { signal: controller.signal })
      .then((settings) => setBranding(settings || {}))
      .catch((error) => {
        if (error?.name !== 'AbortError') setBranding({});
      });
    return () => controller.abort();
  }, []);

  React.useEffect(() => {
    setFlipped(false);
  }, [code]);

  const faceStyle: React.CSSProperties = {
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
  };

  return (
    <section className={`overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${theme.shell} text-white shadow-sm`}>
      <div className="grid gap-7 p-5 sm:p-6 lg:grid-cols-[minmax(17rem,20rem)_1fr] lg:items-center lg:gap-10">
        <div className="mx-auto w-full max-w-[20rem]">
          <button
            type="button"
            onClick={() => setFlipped((value) => !value)}
            className="block w-full rounded-[1.75rem] text-left [perspective:1200px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950"
            aria-label={`Show ${flipped ? 'front' : 'back'} of ${kind.toLowerCase()} card`}
            aria-pressed={flipped}
          >
            <span
              className="relative block aspect-[53.98/85.6] w-full transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none"
              style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
            >
              <span
                className="absolute inset-0 block overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white text-slate-950 shadow-2xl"
                style={faceStyle}
              >
                <span className={`relative block h-[34%] overflow-hidden bg-gradient-to-br ${theme.face} px-[7%] pt-[7%] text-white`}>
                  <span className="absolute -right-[18%] -top-[28%] size-[70%] rounded-full border-[1.5rem] border-white/5" />
                  <span className="absolute -bottom-[32%] -left-[22%] size-[58%] rounded-full bg-white/5" />
                  <span className="relative z-10 flex items-center gap-2.5">
                    {branding.logoUrl ? (
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-sm">
                        <img src={branding.logoUrl} alt="" className="h-full w-full object-contain" draggable={false} />
                      </span>
                    ) : (
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-slate-900">
                        {schoolName[0]?.toUpperCase() || 'S'}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="line-clamp-2 block text-[11px] font-black uppercase leading-tight tracking-[0.08em]">{schoolName}</span>
                      <span className={`mt-1 block text-[8px] font-semibold uppercase tracking-[0.2em] ${theme.accent}`}>{theme.label}</span>
                    </span>
                  </span>
                </span>

                {/* Personnel photos remain natural: no filters, blend modes, overlays, or tilt effects. */}
                <span className="absolute left-1/2 top-[22%] z-10 block h-[31%] w-[43%] -translate-x-1/2 overflow-hidden rounded-2xl border-4 border-white bg-slate-100 shadow-lg">
                  {photoUrl ? (
                    <img src={photoUrl} alt={`${name} profile`} className="h-full w-full object-cover" draggable={false} />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-slate-100 text-3xl font-black text-slate-400">{initials || '?'}</span>
                  )}
                </span>

                <span className="block px-[7%] pt-[32%] text-center">
                  <span className="block truncate text-xl font-black leading-tight tracking-tight">{name}</span>
                  <span className="mt-2 inline-flex rounded-full bg-slate-100 px-4 py-1.5 font-mono text-xs font-black tracking-[0.08em] text-slate-800 ring-1 ring-slate-200">
                    {code}
                  </span>

                  <span className="mt-4 grid grid-cols-2 gap-2 text-left">
                    <CardDetail label="Role" value={roleTitle || normalizeLabel(kind)} />
                    <CardDetail label={kind === 'TEACHER' ? 'Faculty' : 'Department'} value={organizationUnit || '—'} />
                    <CardDetail label="Employment" value={normalizeLabel(employmentType || kind)} />
                    <CardDetail label="Joined" value={formatDate(joinedDate)} />
                  </span>

                  <span className={`mt-4 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] ${active ? 'text-emerald-700' : 'text-amber-700'}`}>
                    <span className={`size-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {normalizeLabel(status)}
                  </span>
                </span>

                <span className="absolute inset-x-[7%] bottom-[3%] flex items-center justify-between border-t border-slate-100 pt-2 text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  <span className="flex items-center gap-1.5"><RoleIcon className="size-3" /> {theme.credential}</span>
                  <ShieldCheck className="size-4 text-teal-600" />
                </span>
              </span>

              <span
                className="absolute inset-0 flex flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white text-slate-950 shadow-2xl [transform:rotateY(180deg)]"
                style={faceStyle}
              >
                <span className={`relative block h-[24%] overflow-hidden bg-gradient-to-br ${theme.face} px-[8%] pt-[8%] text-center text-white`}>
                  <span className="absolute -right-[12%] -top-[35%] size-[65%] rounded-full border-[1.4rem] border-white/5" />
                  <span className="relative flex items-center justify-center gap-2">
                    <ShieldCheck className={`size-6 ${theme.accent}`} />
                    <span className="text-xs font-black uppercase tracking-[0.14em]">Authorized personnel</span>
                  </span>
                  <span className="relative mt-2 block text-[9px] leading-tight text-white/70">This identity card belongs to an authorized member of the school.</span>
                </span>

                <span className="flex flex-1 flex-col px-[8%] pt-[7%]">
                  <span className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    {branding.logoUrl ? (
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                        <img src={branding.logoUrl} alt="" className="h-full w-full object-contain" draggable={false} />
                      </span>
                    ) : (
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-400">{schoolName[0]}</span>
                    )}
                    <span className="min-w-0">
                      <span className="line-clamp-2 block text-sm font-black leading-tight text-slate-900">{schoolName}</span>
                      <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">{theme.credential}</span>
                    </span>
                  </span>

                  <span className="mt-4 block rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Cardholder</span>
                    <span className="mt-1 block truncate text-base font-black text-slate-900">{name}</span>
                    <span className="mt-1 block font-mono text-[10px] font-bold text-slate-500">{code}</span>
                  </span>

                  <span className="mt-4 space-y-2 text-[10px] font-semibold text-slate-600">
                    <span className="flex items-start gap-2">
                      <Phone className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{branding.contactPhone || 'School phone not provided'}</span>
                    </span>
                    <span className="flex items-start gap-2">
                      <Mail className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{branding.contactEmail || 'School email not provided'}</span>
                    </span>
                  </span>

                  <span className="mt-4 block rounded-2xl border border-slate-200 px-4 py-3">
                    <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">If this card is found</span>
                    <span className="mt-1.5 block text-[10px] font-semibold leading-snug text-slate-700">Please return it to {schoolName}.</span>
                  </span>

                  <span className="mt-5 block border-t border-dashed border-slate-300 pt-2 text-center text-[8px] font-semibold uppercase tracking-[0.15em] text-slate-400">Authorized signature</span>
                </span>

                <span className="mx-[8%] mb-[5%] border-t border-slate-100 pt-3 text-center text-[8px] font-medium leading-tight text-slate-400">
                  Property of {schoolName} · Non-transferable
                </span>
              </span>
            </span>
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-white/65">
            <FlipHorizontal2 className="size-3.5" aria-hidden="true" /> Click the card to show its {flipped ? 'front' : 'back'}
          </p>
        </div>

        <div className="min-w-0">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <CreditCard className={`size-6 ${theme.accent}`} />
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold">{normalizeLabel(kind)} Card</h2>
                <Badge className={`border-0 ${theme.badge}`}>
                  <span className={`size-1.5 rounded-full ${theme.dot}`} /> {normalizeLabel(status)}
                </Badge>
              </span>
              <span className="mt-2 block max-w-xl text-sm leading-relaxed text-white/65">
                A profile identity card for {name}. The front shows their school role and employment details; the back carries school contact and return information.
              </span>
            </span>
          </div>

          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <PersonnelDetail label="Card number" value={code} mono />
            <PersonnelDetail label="Role" value={roleTitle || normalizeLabel(kind)} />
            <PersonnelDetail label={kind === 'TEACHER' ? 'Faculty' : 'Department'} value={organizationUnit || '—'} />
            <PersonnelDetail label="Joined" value={formatDate(joinedDate)} />
          </dl>
        </div>
      </div>
    </section>
  );
}

function CardDetail({ label, value }: { label: string; value: string }) {
  return (
    <span className="min-w-0 rounded-lg bg-slate-50 px-2.5 py-2 ring-1 ring-slate-100">
      <span className="block truncate text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</span>
      <span className="mt-0.5 block truncate text-[10px] font-black text-slate-800">{value}</span>
    </span>
  );
}

function PersonnelDetail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
      <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">{label}</dt>
      <dd className={`mt-1 truncate font-semibold text-white/85 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}
