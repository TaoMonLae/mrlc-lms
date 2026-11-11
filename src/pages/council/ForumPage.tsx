import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { councilCategories } from '../../../shared/council';
import { apiSend } from '../../lib/api';
import { CouncilHeader, LoadState, useCouncilData, useDebounced, type Workspace } from './common';
type Post = {
    authorName: string;
    editedAt?: string | null;
    mine?: boolean;
    staffAuthor?: boolean;
    canModerate?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
};
type Topic = Post & {
    id: string;
    title: string;
    body: string;
    category: string;
    createdAt: string;
    updatedAt?: string;
    pinned: boolean;
    locked: boolean;
    hidden: boolean;
    _count: {
        replies: number;
    };
    replies: Reply[];
};
type Reply = Post & {
    id: string;
    body: string;
    createdAt: string;
    hidden: boolean;
};
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const when = (date: string) => new Date(date).toLocaleString('en-GB', { timeZone: 'Asia/Kuala_Lumpur', dateStyle: 'medium', timeStyle: 'short' });
export default function ForumPage() {
    const { id } = useParams();
    const workspace = useCouncilData<Workspace>('/api/council/workspace');
    return <div className="council-page"><CouncilHeader forum/>{!workspace.data ? <LoadState error={workspace.error} retry={workspace.reload}/> : <>{id ? <Discussion key={id} id={id}/> : <ForumList workspace={workspace.data}/>}</>}</div>;
}
function ForumList({ workspace }: {
    workspace: Workspace;
}) {
    const [category, setCategory] = useState(''), [search, setSearch] = useState(''), [page, setPage] = useState(0), [compose, setCompose] = useState(false), [reports, setReports] = useState(false), [hidden, setHidden] = useState(false);
    const query = useDebounced(search.trim());
    const result = useCouncilData<{
        topics: Topic[];
        count: number;
    }>(`/api/council/forum?category=${encodeURIComponent(category)}&search=${encodeURIComponent(query)}&page=${page}&hidden=${hidden}`);
    const filtered = Boolean(query || category || hidden);
    return <><div className="council-toolbar"><label className="council-grow">Find a discussion<input type="search" placeholder="Search by title" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}/></label><button type="button" className="primary" aria-expanded={compose} onClick={() => setCompose(!compose)}>{compose ? 'Close composer' : 'Start a discussion'}</button>{workspace.staff && <button type="button" aria-expanded={reports} onClick={() => setReports(!reports)}>{reports ? 'Close reports' : 'Review reports'}</button>}</div>{compose && <TopicComposer />}{reports && <Reports />}
  {workspace.canManage && <label className="council-check"><input type="checkbox" checked={hidden} onChange={e => { setHidden(e.target.checked); setPage(0); }}/>Show hidden discussions</label>}<div className="council-forum-layout"><aside><nav aria-label="Forum categories">{['', ...councilCategories].map(c => <button type="button" key={c} aria-current={category === c ? 'page' : undefined} onClick={() => { setCategory(c); setPage(0); }}>{c || 'All discussions'}</button>)}</nav><details><summary>Forum guidelines</summary><p>Keep conversations respectful. Do not post passwords, payment details, private cases or another student’s documents.</p><p>Use Report for harmful content. For urgent concerns, tell a trusted staff member directly.</p></details></aside><section aria-label="Discussions" aria-busy={result.loading}>{!result.data ? <LoadState error={result.error} retry={result.reload}/> : <><p className="council-muted" role="status">{result.loading ? 'Updating discussions…' : plural(result.data.count, 'discussion', 'discussions')}</p>{!result.data.topics.length && (filtered ? <div className="council-empty"><h2>{query ? `No discussions match “${query}”` : hidden ? 'No hidden discussions' : `No discussions in ${category} yet`}</h2><p>{query ? 'Check the spelling or try a shorter title word.' : 'Choose another category, or start the first discussion here.'}</p><button type="button" onClick={() => { setSearch(''); setCategory(''); setHidden(false); setPage(0); }}>Show all discussions</button></div> : <div className="council-empty"><h2>No discussions here yet</h2><p>Ask a question, share a study idea or suggest an improvement to school life.</p></div>)}{result.data.topics.map(t => <article className="council-topic-row" key={t.id}><div><p className="council-muted council-topic-meta">{t.category}{t.pinned && ' · Pinned'}{t.locked && ' · Closed'}</p><h2><Link to={`/student-forum/${t.id}`}>{t.title}</Link></h2><p className="council-muted">Started by {t.authorName} · {when(t.createdAt)}</p></div><dl className="council-topic-stats"><div><dt>Replies</dt><dd>{t._count.replies}</dd></div><div><dt>Last activity</dt><dd><time dateTime={t.updatedAt || t.createdAt}>{when(t.updatedAt || t.createdAt)}</time></dd></div></dl></article>)}<Pagination page={page} size={30} count={result.data.count} setPage={setPage}/></>}</section></div></>;
}
function TopicComposer() {
    const navigate = useNavigate();
    const [title, setTitle] = useState(''), [body, setBody] = useState(''), [category, setCategory] = useState<string>(councilCategories[0]);
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    return <form className="council-form council-composer" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(''); try {
        const topic = await apiSend<{ id: string }>('/api/council/forum', 'POST', { title, body, category });
        navigate(`/student-forum/${topic.id}`);
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }}><h2>Start a discussion</h2><label>Title<input required minLength={3} maxLength={160} value={title} onChange={e => setTitle(e.target.value)}/></label><label>Category<select value={category} onChange={e => setCategory(e.target.value)}>{councilCategories.map(c => <option key={c}>{c}</option>)}</select></label><label>Your message<textarea required maxLength={8000} rows={5} value={body} onChange={e => setBody(e.target.value)}/></label><p className="council-muted">Visible to school students and staff. Duty swaps discussed here still need the hostel monitor’s confirmation.</p>{error && <p role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy ? 'Posting…' : 'Post discussion'}</button></form>;
}
function Discussion({ id }: {
    id: string;
}) {
    const navigate = useNavigate();
    const [page, setPage] = useState(0), [reply, setReply] = useState(''), [reportTarget, setReportTarget] = useState<string | null>(null), [reported, setReported] = useState<string[]>([]);
    const [editing, setEditing] = useState<string | null>(null), [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [busy, setBusy] = useState(false), [error, setError] = useState(''), [posting, setPosting] = useState(false), [replyError, setReplyError] = useState('');
    const result = useCouncilData<Topic>(`/api/council/forum/${id}?page=${page}`);
    const t = result.data;
    const send = async (path: string, method: 'PATCH' | 'DELETE', data?: unknown, leave = false) => { setBusy(true); setError(''); try {
        await apiSend(path, method, data);
        setConfirmDelete(null);
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
    // Reported posts are marked in place, as community apps show "Reported" on the flagged item.
    const reportButton = (target: string, label: string) => reported.includes(target)
        ? <button type="button" disabled>Reported</button>
        : <button type="button" aria-expanded={reportTarget === target} onClick={() => setReportTarget(reportTarget === target ? null : target)}>{label}</button>;
    const reportForm = (target: string) => reportTarget === target && <ReportForm key={target} topicId={id} replyId={target || undefined} close={() => setReportTarget(null)} onSent={() => setReported(list => [...list, target])}/>;
    // Own-post actions sit with the post, as in Unity's Q&A ("Reply · Delete · Edit"); removal asks inline, without a modal.
    const authorActions = (post: Post, key: string, path: string, label: string, leave = false) => <>
      {post.canEdit && <button type="button" aria-expanded={editing === key} onClick={() => { setEditing(editing === key ? null : key); setConfirmDelete(null); }}>Edit</button>}
      {post.canDelete && <button type="button" aria-expanded={confirmDelete === key} onClick={() => { setConfirmDelete(confirmDelete === key ? null : key); setEditing(null); }}>Delete</button>}
      {confirmDelete === key && <div className="council-confirm" role="group" aria-label={`Delete your ${label}`}><p>Delete your {label}? Students will no longer see it. Staff can still review it if it was reported.</p><div className="council-controls"><button type="button" className="danger" disabled={busy} onClick={() => send(path, 'DELETE', undefined, leave)}>{busy ? 'Deleting…' : `Delete ${label}`}</button><button type="button" onClick={() => setConfirmDelete(null)}>Keep {label}</button></div></div>}
    </>;
    const byline = (post: Post) => <>{post.authorName}{post.staffAuthor && <span className="council-badge">Staff</span>}{post.mine && <span className="council-muted"> (you)</span>}</>;
    return <section className="council-discussion"><Link to="/student-forum">← All discussions</Link>{!t ? <LoadState error={result.error} retry={result.reload}/> : <><header><p className="council-muted">{t.category}{t.pinned && ' · Pinned'}{t.locked && ' · Closed'}{t.hidden && ' · Hidden from students'}</p>{editing === 'topic' ? <TopicEditor topic={t} close={() => setEditing(null)} saved={() => { setEditing(null); result.reload(); }}/> : <><h2>{t.title}</h2><p>{byline(t)} · {when(t.createdAt)}{t.editedAt && <span className="council-muted"> · Edited</span>}</p></>}</header>{editing !== 'topic' && <div className="council-post-body">{t.body}</div>}<div className="council-controls">{!t.hidden && !t.mine && reportButton('', 'Report discussion')}{authorActions(t, 'topic', `/api/council/forum/${id}`, 'discussion', true)}{t.canModerate && <><button type="button" disabled={busy} onClick={() => send(`/api/council/forum/${id}`, 'PATCH', { pinned: !t.pinned })}>{t.pinned ? 'Unpin' : 'Pin discussion'}</button><button type="button" disabled={busy} onClick={() => send(`/api/council/forum/${id}`, 'PATCH', { locked: !t.locked })}>{t.locked ? 'Reopen replies' : 'Close replies'}</button><button type="button" disabled={busy} onClick={() => send(`/api/council/forum/${id}`, 'PATCH', { hidden: !t.hidden }, !t.hidden)}>{t.hidden ? 'Restore discussion' : 'Hide discussion'}</button></>}</div>{t.mine && !t.canDelete && <p className="council-muted council-hint">Others have replied, so this discussion can't be deleted. You can still edit it while it is open.</p>}{error && <p role="alert">{error}</p>}{reportForm('')}
  <h3>{plural(t._count.replies, 'reply', 'replies')}</h3>{t.replies.map(r => <article className="council-reply" key={r.id}><p><strong>{byline(r)}</strong>{r.hidden && <span> · Hidden</span>}<span className="council-muted"> · {when(r.createdAt)}{r.editedAt && ' · Edited'}</span></p>{editing === r.id ? <ReplyEditor topicId={id} reply={r} close={() => setEditing(null)} saved={() => { setEditing(null); result.reload(); }}/> : <div className="council-post-body">{r.body}</div>}<div className="council-controls">{!r.hidden && !t.hidden && !r.mine && reportButton(r.id, 'Report reply')}{authorActions(r, r.id, `/api/council/forum/${id}/replies/${r.id}`, 'reply')}{r.canModerate && <button type="button" disabled={busy} onClick={() => send(`/api/council/forum/${id}/replies/${r.id}`, 'PATCH', { hidden: !r.hidden })}>{r.hidden ? 'Restore reply' : 'Hide reply'}</button>}</div>{reportForm(r.id)}</article>)}<Pagination page={page} size={50} count={t._count.replies} setPage={setPage}/>
  {t.locked || t.hidden ? <p className="council-notice">This discussion is closed to new replies.</p> : <form className="council-form" onSubmit={async (e) => { e.preventDefault(); setPosting(true); setReplyError(''); try {
            await apiSend(`/api/council/forum/${id}/replies`, 'POST', { body: reply });
            setReply('');
            const last = Math.floor(t._count.replies / 50);
            if (last === page)
                result.reload();
            else
                setPage(last);
        }
        catch (e) {
            setReplyError((e as Error).message);
        }
        finally {
            setPosting(false);
        } }}><label>Add your reply<textarea required rows={4} maxLength={4000} value={reply} aria-invalid={replyError ? true : undefined} aria-describedby={replyError ? 'council-reply-error' : undefined} onChange={e => setReply(e.target.value)}/></label>{replyError && <p role="alert" id="council-reply-error">{replyError}</p>}<button className="primary" disabled={posting}>{posting ? 'Posting…' : 'Post reply'}</button></form>}</>}</section>;
}
function useSave(path: string, saved: () => void) {
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    const save = async (data: unknown) => { setBusy(true); setError(''); try {
        await apiSend(path, 'PATCH', data);
        saved();
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } };
    return { busy, error, save };
}
function TopicEditor({ topic, close, saved }: {
    topic: Topic;
    close: () => void;
    saved: () => void;
}) {
    const [title, setTitle] = useState(topic.title), [body, setBody] = useState(topic.body), [category, setCategory] = useState(topic.category);
    const { busy, error, save } = useSave(`/api/council/forum/${topic.id}/content`, saved);
    return <form className="council-form council-composer" aria-label="Edit discussion" onSubmit={e => { e.preventDefault(); void save({ title, body, category }); }}><label>Title<input required minLength={3} maxLength={160} value={title} autoFocus onChange={e => setTitle(e.target.value)}/></label><label>Category<select value={category} onChange={e => setCategory(e.target.value)}>{councilCategories.map(c => <option key={c}>{c}</option>)}</select></label><label>Your message<textarea required maxLength={8000} rows={6} value={body} onChange={e => setBody(e.target.value)}/></label>{error && <p role="alert">{error}</p>}<div className="council-controls"><button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button><button type="button" onClick={close}>Cancel</button></div></form>;
}
function ReplyEditor({ topicId, reply, close, saved }: {
    topicId: string;
    reply: Reply;
    close: () => void;
    saved: () => void;
}) {
    const [body, setBody] = useState(reply.body);
    const { busy, error, save } = useSave(`/api/council/forum/${topicId}/replies/${reply.id}/content`, saved);
    return <form className="council-form" aria-label="Edit reply" onSubmit={e => { e.preventDefault(); void save({ body }); }}><label>Edit your reply<textarea required maxLength={4000} rows={4} value={body} autoFocus onChange={e => setBody(e.target.value)}/></label>{error && <p role="alert">{error}</p>}<div className="council-controls"><button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save reply'}</button><button type="button" onClick={close}>Cancel</button></div></form>;
}
function ReportForm({ topicId, replyId, close, onSent }: {
    topicId: string;
    replyId?: string;
    close: () => void;
    onSent: () => void;
}) {
    const [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [sent, setSent] = useState(false);
    return <form className="council-form council-composer council-report" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(''); try {
        await apiSend(`/api/council/forum/${topicId}/reports`, 'POST', { replyId, reason });
        setSent(true);
        onSent();
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }}><h3>{replyId ? 'Report this reply' : 'Report this discussion'}</h3>{sent ? <p role="status">Report sent to staff. They will review it and decide what to do. For urgent concerns, contact a trusted staff member directly.</p> : <><p>Your reason is visible only to school staff.</p><label>What should staff review?<textarea required minLength={3} maxLength={1000} value={reason} autoFocus onChange={e => setReason(e.target.value)}/></label></>}{error && <p role="alert">{error}</p>}<div className="council-controls">{!sent && <button disabled={busy} className="primary">{busy ? 'Sending…' : 'Send report'}</button>}<button type="button" onClick={close}>{sent ? 'Close' : 'Cancel'}</button></div></form>;
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
    return <section className="council-composer"><h2>Reports for staff</h2><p>Review the content and take action before resolving a report.</p>{error && <p role="alert">{error}</p>}{!result.data ? <LoadState error={result.error} retry={result.reload}/> : !result.data.length ? <p>No unresolved reports.</p> : result.data.map(r => <article className="council-reply" key={r.id}><h3><Link to={`/student-forum/${r.topic.id}`}>{r.topic.title}</Link></h3><p className="council-muted">{r.reply ? 'Reported reply' : 'Reported discussion'} · {when(r.createdAt)}{(r.reply || r.topic).hidden && ' · Hidden from students'}</p><p className="council-post-body">{r.reply?.body || r.topic.body}</p><p><strong>Reported concern:</strong> {r.reason}</p><div className="council-controls"><button type="button" disabled={busy} onClick={() => act(r.reply ? `/api/council/forum/${r.topic.id}/replies/${r.reply.id}` : `/api/council/forum/${r.topic.id}`, { hidden: !(r.reply || r.topic).hidden })}>{(r.reply || r.topic).hidden ? 'Restore content' : 'Hide content'}</button><button type="button" disabled={busy} onClick={() => act(`/api/council/reports/${r.id}`, {})}>Resolve report</button></div></article>)}</section>;
}
function Pagination({ page, count, size, setPage }: {
    page: number;
    count: number;
    size: number;
    setPage: (n: number) => void;
}) {
    return count > size ? <nav className="council-controls council-pagination" aria-label="Pagination"><button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous page</button><span>Page {page + 1} of {Math.ceil(count / size)}</span><button type="button" disabled={(page + 1) * size >= count} onClick={() => setPage(page + 1)}>Next page</button></nav> : null;
}
