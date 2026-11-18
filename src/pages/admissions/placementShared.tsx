import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { PLACEMENT_LEVEL_LABELS, type PlacementLevel } from '../../../shared/placementTest';

export const levelTone: Record<PlacementLevel, string> = {
  GED: 'border-success/50 bg-success/10 text-foreground',
  PRE_GED: 'border-primary/50 bg-primary/10 text-foreground',
  BELOW_PRE_GED: 'border-warning/50 bg-warning/10 text-foreground',
};

export function LevelBadge({ level, muted }: { level: PlacementLevel; muted?: boolean }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-sm border px-2 py-0.5 text-xs font-semibold ${muted ? 'border-border bg-transparent text-muted-foreground' : levelTone[level]}`}>{PLACEMENT_LEVEL_LABELS[level]}</span>;
}

export const statusLabel: Record<string, string> = { NEW: 'New', REVIEWED: 'Reviewed', CONTACTED: 'Contacted', ARCHIVED: 'Archived' };

const sections = [
  { to: '/placement-results', label: 'Results', end: true },
  { to: '/placement-results/questions', label: 'Question bank', end: false },
  { to: '/placement-results/settings', label: 'Settings', end: false },
];

export function PlacementNav() {
  return <nav aria-label="Placement test" className="flex gap-1 border-b border-border">
    {sections.map(item => <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium transition-colors ${isActive ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{item.label}</NavLink>)}
  </nav>;
}

export function PlacementHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return <div className="space-y-4">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
    <PlacementNav />
  </div>;
}

export async function downloadWithAuth(path: string, fallbackName: string) {
  const token = sessionStorage.getItem('auth_token');
  const res = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Download failed');
  }
  const blob = await res.blob();
  const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
