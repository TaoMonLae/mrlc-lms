import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { apiSend } from '../../lib/api';
import { councilResponsibilities, termEnd } from '../../../shared/council';
import { STUDENT_COUNCIL_ROLES, STUDENT_COUNCIL_ROLE_LABELS, studentCouncilRoleLabel } from '../../../shared/studentCouncil';
import { CouncilHeader, LoadState, shiftDate, studentName, useCouncilData, type Workspace } from './common';
import RotationBuilder from './RotationBuilder';
type Entry = {
    id: string;
    date: string;
    dutyNumber: number;
    dutyName: string;
    dutyType: string;
    instructions: string;
    groupNumber: number;
    groupName: string;
    members: {
        id: string;
        name: string;
    }[];
    status: string;
    rating: number | null;
    note: string;
    version: number;
    reviewedByName?: string;
};
const TABS = [['register', 'Duty register'], ['rotation', 'Teams & rotation'], ['council', 'Council & handbook']] as const;
type TabKey = typeof TABS[number][0];
export default function CouncilPage() {
    const workspace = useCouncilData<Workspace>('/api/council/workspace');
    // The open tab lives in the URL (as copy.ai settings sections do), so refresh, back and shared links keep it.
    const [params, setParams] = useSearchParams();
    const tabs = TABS.filter(([key]) => key !== 'rotation' || workspace.data?.canManage);
    const requested = params.get('tab');
    const tab: TabKey = tabs.find(([key]) => key === requested)?.[0] ?? 'register';
    const refs = useRef<Record<string, HTMLButtonElement | null>>({});
    const select = (key: TabKey, focus = false) => {
        setParams(next => { if (key === 'register') next.delete('tab'); else next.set('tab', key); return next; }, { replace: true });
        if (focus) refs.current[key]?.focus();
    };
    // WAI-ARIA tabs: arrows move and activate, Home/End jump; only the selected tab is in the tab order.
    const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
        const index = tabs.findIndex(([key]) => key === tab);
        const target = e.key === 'ArrowRight' ? (index + 1) % tabs.length : e.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
        if (target < 0)
            return;
        e.preventDefault();
        select(tabs[target][0], true);
    };
    const panel = (key: TabKey, content: ReactNode) => tab === key && <div role="tabpanel" id={`council-panel-${key}`} aria-labelledby={`council-tab-${key}`} tabIndex={0} className="council-panel">{content}</div>;
    return <div className="council-page"><CouncilHeader />{!workspace.data ? <LoadState error={workspace.error} retry={workspace.reload}/> : <>
    <div className="council-tabs" role="tablist" aria-label="Council workspace">{tabs.map(([key, label]) => <button type="button" role="tab" key={key} id={`council-tab-${key}`} ref={el => { refs.current[key] = el; }} aria-selected={tab === key} aria-controls={`council-panel-${key}`} tabIndex={tab === key ? 0 : -1} onKeyDown={onKeyDown} onClick={() => select(key)}>{label}</button>)}</div>
    {panel('register', <Register workspace={workspace.data}/>)}
    {panel('rotation', workspace.data.canManage && <RotationBuilder workspace={workspace.data} onSaved={() => { workspace.reload(); select('register'); }}/>)}
    {panel('council', <CouncilDirectory workspace={workspace.data} reload={workspace.reload}/>)}
  </>}</div>;
}
function Register({ workspace }: {
    workspace: Workspace;
}) {
    const [from, setFrom] = useState(workspace.today);
    const [mine, setMine] = useState(false);
    const [plan, setPlan] = useState('');
    const [editing, setEditing] = useState<string>();
    const result = useCouncilData<Entry[]>(`/api/council/entries?from=${from}&to=${shiftDate(from, 6)}&planId=${plan}`);
    const entries = result.data?.filter(e => !mine || e.members.some(m => m.id === workspace.studentId));
    return <section><div className="council-toolbar"><div><h2>Seven-day register</h2><p>Weekly teams, daily check-ins. Times follow Malaysia time.</p></div><div className="council-controls"><button aria-label="Previous seven days" onClick={() => setFrom(shiftDate(from, -7))}>←</button><label>From<input type="date" value={from} onChange={e => { if (e.target.value)
        setFrom(e.target.value); }}/></label><button aria-label="Next seven days" onClick={() => setFrom(shiftDate(from, 7))}>→</button><button onClick={() => setFrom(workspace.today)}>Today</button></div></div>
    <div className="council-controls council-filter"><label>Rotation<select value={plan} onChange={e => setPlan(e.target.value)}><option value="">All rotations</option>{workspace.plans.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>{workspace.studentId && <label className="council-check"><input type="checkbox" checked={mine} onChange={e => setMine(e.target.checked)}/>My teams only</label>}</div>
    <div aria-busy={result.loading}>{!entries ? <LoadState error={result.error} retry={result.reload}/> : !entries.length ? <div className="council-empty"><h3>No duties in this period</h3><p>{workspace.canManage ? 'Create a weekly rotation in Teams & rotation, or choose another date.' : 'Check another date or ask your hostel monitor about the next rotation.'}</p></div> : <div className="council-register">{entries.map(entry => {
                const isMember = entry.members.some(m => m.id === workspace.studentId);
                const canUpdate = entry.date <= workspace.today && (workspace.canManage || (isMember && entry.rating === null && entry.status !== 'SKIPPED'));
                return <article key={entry.id} className="council-duty"><div className="council-duty-date"><time>{new Date(`${entry.date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</time><span className="council-muted">{entry.dutyType === 'COOKING' ? 'Cooking' : 'Cleaning'}</span></div><div><h3>Duty {entry.dutyNumber} · {entry.dutyName}</h3><p><strong>Group {entry.groupNumber} — {entry.groupName}</strong></p><p className="council-muted">{entry.members.map(m => m.name).join(', ')}</p><details><summary>Duty instructions</summary><p>{entry.instructions || 'Ask your hostel monitor for instructions.'}</p></details>{entry.note && <p className="council-note">{entry.note}</p>}</div><div className="council-duty-status"><span className={`council-status ${entry.status.toLowerCase()}`}>{entry.status === 'COMPLETED' ? 'Completed' : entry.status === 'SKIPPED' ? 'Not completed' : 'Pending'}</span><strong>{entry.rating !== null ? `${entry.rating} / 5 points` : 'Not rated'}</strong>{entry.reviewedByName && <small>Last updated by {entry.reviewedByName}</small>}{canUpdate && <button onClick={() => setEditing(editing === entry.id ? undefined : entry.id)}>{workspace.canManage ? 'Review duty' : 'Mark work done'}</button>}</div>{editing === entry.id && <Review entry={entry} workspace={workspace} own={isMember} onSaved={() => { setEditing(undefined); result.reload(); }}/>}</article>;
            })}</div>}</div>
    <p className="council-footnote">Points are duty feedback, separate from conduct records. The 1–5 scale is a school-requested feature; the Council handbook does not define scoring criteria.</p>
  </section>;
}
function Review({ entry, workspace, own, onSaved }: {
    entry: Entry;
    workspace: Workspace;
    own: boolean;
    onSaved: () => void;
}) {
    const [status, setStatus] = useState(workspace.canManage ? entry.status : 'COMPLETED');
    const [rating, setRating] = useState(entry.rating?.toString() || '');
    const [note, setNote] = useState(entry.note);
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    const canRate = workspace.canManage && (!own || workspace.staff);
    return <form className="council-review" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(''); try {
        await apiSend(`/api/council/entries/${entry.id}`, 'PATCH', { version: entry.version, status, rating: status === 'COMPLETED' && rating ? Number(rating) : null, note });
        onSaved();
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }}>
    {workspace.canManage && <label>Status<select value={status} onChange={e => setStatus(e.target.value)}><option value="PENDING">Pending</option><option value="COMPLETED">Completed</option><option value="SKIPPED">Not completed</option></select></label>}
    {canRate ? <label>Points<select value={rating} disabled={status !== 'COMPLETED'} onChange={e => setRating(e.target.value)}><option value="">Not rated</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} / 5</option>)}</select></label> : <p>Another council member or staff member reviews your team’s work.</p>}
    <label className="council-grow">Duty feedback<textarea maxLength={1000} value={note} onChange={e => setNote(e.target.value)} placeholder="What was completed? What needs attention? Keep private matters out of this shared register."/></label><button className="primary" disabled={busy || (!canRate && entry.rating !== null)}>{busy ? 'Saving…' : 'Save check-in'}</button>{error && <p role="alert">{error}</p>}
  </form>;
}
function CouncilDirectory({ workspace, reload }: {
    workspace: Workspace;
    reload: () => void;
}) {
    const [studentId, setStudentId] = useState(''), [role, setRole] = useState('PRESIDENT'), [startDate, setStart] = useState(workspace.today);
    const [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState('');
    return <section className="council-handbook"><div><h2>The current council</h2><p>Appointments last three months. Staff record appointments and renewals after the school’s selection process.</p>{workspace.members.length ? <ul className="council-directory">{workspace.members.map(s => { const a = workspace.appointments.find(a => a.studentId === s.id && a.role === s.studentCouncilRole); return <li key={s.id}><strong>{studentName(s)}</strong><span>{studentCouncilRoleLabel(s.studentCouncilRole)}</span><small>{a ? `${a.startDate} — ${a.endDate}${a.endDate < workspace.today ? ' · Term ended' : a.startDate > workspace.today ? ' · Upcoming' : ''}` : 'Term dates need staff confirmation'}</small></li>; })}</ul> : <p>No council appointments recorded yet.</p>}
      {workspace.staff && <form className="council-form" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(''); setSaved(''); try {
        await apiSend('/api/council/appointments', 'POST', { studentId, role: role || null, startDate });
        const student = workspace.students.find(s => s.id === studentId);
        setSaved(`${student ? studentName(student) : 'Student'}: ${role ? `${studentCouncilRoleLabel(role)} appointment saved` : 'appointment ended'}.`);
        reload();
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }}><h3>Record an appointment</h3><label>Student<select required value={studentId} onChange={e => setStudentId(e.target.value)}><option value="">Choose student</option>{workspace.students.map(s => <option key={s.id} value={s.id}>{studentName(s)} · {s.studentCode}</option>)}</select></label><label>Role<select value={role} onChange={e => setRole(e.target.value)}><option value="">End appointment</option>{STUDENT_COUNCIL_ROLES.map(r => <option key={r} value={r}>{STUDENT_COUNCIL_ROLE_LABELS[r]}</option>)}</select></label><label>Term starts<input type="date" required value={startDate} onChange={e => setStart(e.target.value)}/></label><p>{startDate && role && `Term ends ${termEnd(startDate)}. A renewal must be recorded by staff.`}</p><button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save appointment'}</button>{error && <p role="alert">{error}</p>}<p role="status" className="council-muted">{saved}</p></form>}
    </div><aside><h2>From the Council handbook</h2><p className="council-muted">MRLC GED Preparation Program · 2025–2026 edition</p>{councilResponsibilities.map(([name, duty, page]) => <details key={name}><summary>{name}</summary><p>{duty}</p><small>Handbook page {page}</small></details>)}<h3>Weekly rhythm</h3><p>Hostel monitors confirm teams at the start of each week. Students must not cook and clean during the same week. The handbook’s eight-team example can be adapted to the actual roster.</p><p>Meet weekly, with the President chairing and the Secretary taking minutes. Record action owners and due dates; distribute minutes within 48 hours.</p><p className="council-footnote">Sources: Council handbook pages 2, 6–10. Duty instructions follow page 7. For urgent safety concerns, contact staff directly.</p></aside></section>;
}
