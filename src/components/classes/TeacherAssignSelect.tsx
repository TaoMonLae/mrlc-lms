import React, { useEffect, useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TeacherOption { id: string; name: string }

interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
}

/** Multi-select for assigning teachers to a class (shows chips + an add picker). */
export function TeacherAssignSelect({ value, onChange }: Props) {
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    fetch('/api/teachers', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) =>
        setTeachers(
          (Array.isArray(data) ? data : []).map((t: any) => ({
            id: t.id,
            name: `${t.user?.firstName ?? ''} ${t.user?.lastName ?? ''}`.trim() || t.teacherCode,
          }))
        )
      )
      .catch(() => {});
  }, []);

  const available = teachers.filter((t) => !value.includes(t.id));
  const nameOf = (id: string) => teachers.find((t) => t.id === id)?.name || id;

  return (
    <div className="space-y-3">
      <Select value="" onValueChange={(id) => id && onChange([...value, id])}>
        <SelectTrigger>
          <SelectValue placeholder={available.length ? 'Add a teacher…' : 'All teachers assigned'} />
        </SelectTrigger>
        <SelectContent>
          {available.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              <span className="flex items-center gap-2"><UserPlus className="h-3.5 w-3.5" /> {t.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((id) => (
            <Badge key={id} variant="secondary" className="pl-3 pr-1.5 py-1 gap-1.5 text-sm font-medium">
              {nameOf(id)}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== id))}
                className="rounded-full hover:bg-slate-300/50 p-0.5"
                aria-label={`Remove ${nameOf(id)}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400">No teachers assigned yet.</p>
      )}
    </div>
  );
}

export default TeacherAssignSelect;
