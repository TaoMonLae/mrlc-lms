import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { apiGet } from '../../lib/api';
import './council.css';
export type Student = {
    id: string;
    studentCode: string;
    preferredName?: string;
    studentCouncilRole?: string;
    boardingType: string;
    user?: {
        firstName: string;
        lastName: string;
    };
};
export type Workspace = {
    canManage: boolean;
    staff: boolean;
    studentId?: string;
    today: string;
    members: Student[];
    students: Student[];
    plans: {
        id: string;
        name: string;
        config: any;
    }[];
    appointments: {
        studentId: string;
        role: string;
        startDate: string;
        endDate: string;
    }[];
};
export const studentName = (s: Student) => s.preferredName || `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim() || s.studentCode;
export function useCouncilData<T>(path: string) {
    const [data, setData] = useState<T>();
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);
    const reload = useCallback(() => setRevision(n => n + 1), []);
    useEffect(() => {
        const controller = new AbortController();
        setData(undefined);
        setError('');
        apiGet<T>(path, { signal: controller.signal, timeoutMs: 15000 }).then(setData).catch(e => { if (!controller.signal.aborted)
            setError(e.message); });
        return () => controller.abort();
    }, [path, revision]);
    return { data, error, reload };
}
export function LoadState({ error, retry }: {
    error: string;
    retry: () => void;
}) {
    return error ? <div role="alert" className="council-notice">{error} <button onClick={retry}>Try again</button></div> : <p role="status">Loading school records…</p>;
}
export function CouncilHeader({ forum = false }: {
    forum?: boolean;
}) {
    return <header className="council-header"><div><h1>{forum ? 'Student forum' : 'Student Council'}</h1><p>{forum ? 'Questions, ideas and everyday school life.' : 'Shared duties. A fair turn for every team.'}</p></div><Link className="council-link" to={forum ? '/council' : '/student-forum'}>{forum ? 'Council & duties' : 'Open student forum'} →</Link></header>;
}
export const shiftDate = (date: string, days: number) => new Date(Date.parse(date) + days * 86400000).toISOString().slice(0, 10);
