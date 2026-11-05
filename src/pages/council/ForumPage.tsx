import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { councilCategories } from '../../../shared/council';
import { apiSend } from '../../lib/api';
import { CouncilHeader, LoadState, useCouncilData, type Workspace } from './common';
type Topic = {
    id: string;
    title: string;
    body: string;
    category: string;
    authorName: string;
    createdAt: string;
    pinned: boolean;
    locked: boolean;
    hidden: boolean;
    _count: {
        replies: number;
    };
    replies: Reply[];
};
type Reply = {
    id: string;
    body: string;
    authorName: string;
    createdAt: string;
    hidden: boolean;
};
const when = (date: string) => new Date(date).toLocaleString('en-GB', { timeZone: 'Asia/Kuala_Lumpur', dateStyle: 'medium', timeStyle: 'short' });
export default function ForumPage() {
    const { id } = useParams();
    const workspace = useCouncilData<Workspace>('/api/council/workspace');
    return <div className="council-page"><CouncilHeader forum/>{!workspace.data ? <LoadState error={workspace.error} retry={workspace.reload}/> : <>{id ? <Discussion key={id} id={id} workspace={workspace.data}/> : <ForumList workspace={workspace.data}/>}</>}</div>;
}
function ForumList({ workspace }: {
    workspace: Workspace;
}) {
    const [category, setCategory] = useState(''), [search, setSearch] = useState(''), [page, setPage] = useState(0), [compose, setCompose] = useState(false), [reports, setReports] = useState(false), [hidden, setHidden] = useState(false);
    const result = useCouncilData<{
        topics: Topic[];
        count: number;
    }>(`/api/council/forum?category=${encodeURIComponent(category)}&search=${encodeURIComponent(search)}&page=${page}&hidden=${hidden}`);
    return <><div className="council-toolbar"><label className="council-grow">Find a discussion<input type="search" placeholder="Search by title" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}/></label><button className="primary" onClick={() => setCompose(!compose)}>{compose ? 'Close composer' : 'Start a discussion'}</button>{workspace.staff && <button onClick={() => setReports(!reports)}>{reports ? 'Close reports' : 'Review reports'}</button>}</div>{compose && <TopicComposer />}{reports && <Reports />}
  {workspace.canManage && <label className="council-check"><input type="checkbox" checked={hidden} onChange={e => { setHidden(e.target.checked); setPage(0); }}/>Show hidden discussions</label>}<div className="council-forum-layout"><aside><nav aria-label="Forum categories">{['', ...councilCategories].map(c => <button key={c} aria-current={category === c ? 'page' : undefined} onClick={() => { setCategory(c); setPage(0); }}>{c || 'All discussions'}</button>)}</nav><details><summary>Forum guidelines</summary><p>Keep conversations respectful. Do not post passwords, payment details, private cases or another student’s documents.</p><p>Use Report for harmful content. For urgent concerns, tell a trusted staff member directly.</p></details></aside><section aria-label="Discussions">{!result.data ? <LoadState error={result.error} retry={result.reload}/> : <><p className="council-muted">{result.data.count} {result.data.count === 1 ? 'discussion' : 'discussions'}</p>{!result.data.topics.length && <div className="council-empty"><h2>No discussions here yet</h2><p>Ask a question, share a study idea or suggest an improvement to school life.</p></div>}{result.data.topics.map(t => <article className="council-topic-row" key={t.id}><div><span className="council-muted">{t.category}{t.pinned && ' · Pinned'}{t.locked && ' · Closed'}</span><h2><Link to={`/student-forum/${t.id}`}>{t.title}</Link></h2><p className="council-muted">{t.authorName} · {when(t.createdAt)}</p></div><span>{t._count.replies} {t._count.replies === 1 ? 'reply' : 'replies'}</span></article>)}<Pagination page={page} size={30} count={result.data.count} setPage={setPage}/></>}</section></div></>;
}
function TopicComposer() {
    const navigate = useNavigate();
    const [title, setTitle] = useState(''), [body, setBody] = useState(''), [category, setCategory] = useState<string>(councilCategories[0]);
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    return <form className="council-form council-composer" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(''); try {
        const topic = await apiSend<Topic>('/api/council/forum', 'POST', { title, body, category });
        navigate(`/student-forum/${topic.id}`);
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }}><h2>Start a discussion</h2><label>Title<input required minLength={3} maxLength={160} value={title} onChange={e => setTitle(e.target.value)}/></label><label>Category<select value={category} onChange={e => setCategory(e.target.value)}>{councilCategories.map(c => <option key={c}>{c}</option>)}</select></label><label>Your message<textarea required maxLength={8000} rows={5} value={body} onChange={e => setBody(e.target.value)}/></label><p className="council-muted">Visible to school students and staff. Duty swaps discussed here still need the hostel monitor’s confirmation.</p>{error && <p role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy ? 'Posting…' : 'Post discussion'}</button></form>;
}
function Discussion({ id, workspace }: {
    id: string;
    workspace: Workspace;
}) {
    const navigate = useNavigate();
    const [page, setPage] = useState(0), [reply, setReply] = useState(''), [reportTarget, setReportTarget] = useState<string | null>(null);
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    const result = useCouncilData<Topic>(`/api/council/forum/${id}?page=${page}`);
    const t = result.data;
    const moderate = async (path: string, data: unknown, leave = false) => { setBusy(true); setError(''); try {
        await apiSend(path, 'PATCH', data);
        if (leave)
            navigate('/student-forum');
        else
            result.reload();
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } };
    return <section className="council-discussion"><Link to="/student-forum">← All discussions</Link>{!t ? <LoadState error={result.error} retry={result.reload}/> : <><header><p className="council-muted">{t.category}{t.pinned && ' · Pinned'}{t.locked && ' · Closed'}{t.hidden && ' · Hidden from students'}</p><h2>{t.title}</h2><p>{t.authorName} · {when(t.createdAt)}</p></header><div className="council-post-body">{t.body}</div><div className="council-controls"><button onClick={() => setReportTarget('')}>Report discussion</button>{workspace.canManage && <><button disabled={busy} onClick={() => moderate(`/api/council/forum/${id}`, { pinned: !t.pinned })}>{t.pinned ? 'Unpin' : 'Pin discussion'}</button><button disabled={busy} onClick={() => moderate(`/api/council/forum/${id}`, { locked: !t.locked })}>{t.locked ? 'Reopen replies' : 'Close replies'}</button><button disabled={busy} onClick={() => moderate(`/api/council/forum/${id}`, { hidden: !t.hidden }, !t.hidden)}>{t.hidden ? 'Restore discussion' : 'Hide discussion'}</button></>}</div>{error && <p role="alert">{error}</p>}{reportTarget !== null && <ReportForm topicId={id} replyId={reportTarget || undefined} close={() => setReportTarget(null)}/>}
  <h3>{t._count.replies} replies</h3>{t.replies.map(r => <article className="council-reply" key={r.id}><p><strong>{r.authorName}</strong>{r.hidden && <span> · Hidden</span>}<span className="council-muted"> · {when(r.createdAt)}</span></p><div className="council-post-body">{r.body}</div><div className="council-controls"><button onClick={() => setReportTarget(r.id)}>Report reply</button>{workspace.canManage && <button disabled={busy} onClick={() => moderate(`/api/council/forum/${id}/replies/${r.id}`, { hidden: !r.hidden })}>{r.hidden ? 'Restore reply' : 'Hide reply'}</button>}</div></article>)}<Pagination page={page} size={50} count={t._count.replies} setPage={setPage}/>
  {t.locked || t.hidden ? <p className="council-notice">This discussion is closed to new replies.</p> : <form className="council-form" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(''); try {
            await apiSend(`/api/council/forum/${id}/replies`, 'POST', { body: reply });
            setReply('');
            setPage(Math.floor(t._count.replies / 50));
            result.reload();
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
        } }}><label>Add your reply<textarea required rows={4} maxLength={4000} value={reply} onChange={e => setReply(e.target.value)}/></label><button className="primary" disabled={busy}>{busy ? 'Posting…' : 'Post reply'}</button></form>}</>}</section>;
}
function ReportForm({ topicId, replyId, close }: {
    topicId: string;
    replyId?: string;
    close: () => void;
}) {
    const [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [sent, setSent] = useState(false);
    return <form className="council-form council-composer" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try {
        await apiSend(`/api/council/forum/${topicId}/reports`, 'POST', { replyId, reason });
        setSent(true);
        setMessage('Report sent to staff. For urgent concerns, contact a trusted staff member directly.');
    }
    catch (e) {
        setMessage((e as Error).message);
    }
    finally {
        setBusy(false);
    } }}><h3>{replyId ? 'Report this reply' : 'Report this discussion'}</h3><p>Your reason is visible only to school staff.</p>{!sent && <label>What should staff review?<textarea required minLength={3} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)}/></label>}{message && <p role="status">{message}</p>}<div className="council-controls">{!sent && <button disabled={busy} className="primary">Send report</button>}<button type="button" onClick={close}>Close</button></div></form>;
}
function Reports() {
    const result = useCouncilData<Array<{
        id: string;
        reason: string;
        createdAt: string;
        topic: Topic;
        reply: Reply | null;
    }>>('/api/council/reports');
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    async function act(path: string, body: unknown) { setBusy(true); setError(''); try {
        await apiSend(path, 'PATCH', body);
        result.reload();
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    return <section className="council-composer"><h2>Reports for staff</h2><p>Review the content and take action before resolving a report.</p>{error && <p role="alert">{error}</p>}{!result.data ? <LoadState error={result.error} retry={result.reload}/> : !result.data.length ? <p>No unresolved reports.</p> : result.data.map(r => <article className="council-reply" key={r.id}><h3>{r.topic.title}</h3><p className="council-post-body">{r.reply?.body || r.topic.body}</p><p><strong>Reported concern:</strong> {r.reason}</p><div className="council-controls"><button disabled={busy} onClick={() => act(r.reply ? `/api/council/forum/${r.topic.id}/replies/${r.reply.id}` : `/api/council/forum/${r.topic.id}`, { hidden: !(r.reply || r.topic).hidden })}>{(r.reply || r.topic).hidden ? 'Restore content' : 'Hide content'}</button><button disabled={busy} onClick={() => act(`/api/council/reports/${r.id}`, {})}>Resolve report</button></div></article>)}</section>;
}
function Pagination({ page, count, size, setPage }: {
    page: number;
    count: number;
    size: number;
    setPage: (n: number) => void;
}) {
    return count > size ? <nav className="council-controls council-pagination" aria-label="Pagination"><button disabled={page === 0} onClick={() => setPage(page - 1)}>Previous page</button><span>Page {page + 1} of {Math.ceil(count / size)}</span><button disabled={(page + 1) * size >= count} onClick={() => setPage(page + 1)}>Next page</button></nav> : null;
}
