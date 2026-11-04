import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Eye, KeyRound, LockKeyhole, Pencil, Search } from 'lucide-react';
import './exam-directory.css';

export type ExamAccess = 'owner' | 'editor' | 'admin' | 'viewer';

export function canEditListedExam(access?: ExamAccess) {
  return access === 'owner' || access === 'editor' || access === 'admin';
}

export function DirectorySearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="exam-directory-search">
    <Search size={17} aria-hidden="true" />
    <input type="search" aria-label="Search exams" placeholder="Search title, class, subject or owner" value={value} onChange={e => onChange(e.target.value)} />
  </label>;
}

export function DirectoryColumns({ detail }: { detail: string }) {
  return <div className="exam-directory-columns" aria-hidden="true">
    <span>Exam</span><span>{detail}</span><span>Your access</span><span />
  </div>;
}

interface RowProps {
  id: string; title: string; status: string; subject: string; className: string;
  access?: ExamAccess; ownerName?: string | null; children: ReactNode; actions: ReactNode;
}

export function DirectoryRow({ id, title, status, subject, className, access, ownerName, children, actions }: RowProps) {
  const canEdit = canEditListedExam(access);
  const labels = { owner: 'Owner', editor: 'Can edit', admin: 'Administrator', viewer: 'Read only' };
  const AccessIcon = access === 'owner' || access === 'admin' ? KeyRound : access === 'editor' ? Pencil : LockKeyhole;
  const cleanStatus = status.replaceAll('_', ' ').toLowerCase();
  return <li className="exam-directory-row">
    <div className="exam-directory-identity">
      <span className="exam-directory-status" data-status={status}>{cleanStatus.charAt(0).toUpperCase() + cleanStatus.slice(1)}</span>
      <h2><Link to={`/exams/${id}${canEdit ? '' : '/preview'}`}>{title}</Link></h2>
      <p>{[subject, className].filter(Boolean).join(' · ')}</p>
    </div>
    <div className="exam-directory-details">{children}</div>
    <div className="exam-directory-access">
      <strong><AccessIcon size={14} aria-hidden="true" />{canEdit ? labels[access!] : labels.viewer}</strong>
      <span>{access === 'owner' ? ownerName || 'You' : ownerName ? `Owner · ${ownerName}` : 'Owner unrecorded'}</span>
    </div>
    <div className="exam-directory-row-actions">{canEdit ? actions :
      <Link className="exam-directory-link" to={`/exams/${id}/preview`}><Eye size={16} aria-hidden="true" />View exam</Link>}
    </div>
  </li>;
}
