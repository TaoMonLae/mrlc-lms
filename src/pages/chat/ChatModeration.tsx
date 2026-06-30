import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Trash2, Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { apiGet, apiSend, qs } from '../../lib/api';

interface Report {
  id: string; status: string; reason: string | null; createdAt: string;
  conversationId: string;
  message: { id: string; body: string; sender: string; createdAt: string };
}

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-amber-100 text-amber-700',
  ACTIONED: 'bg-rose-100 text-rose-700',
  DISMISSED: 'bg-slate-200 text-slate-600',
};

export default function ChatModeration() {
  const [reports, setReports] = useState<Report[]>([]);
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setReports(await apiGet<Report[]>(`/api/chat/reports${qs({ status: statusFilter })}`));
    } catch (err: any) {
      toast.error(err.message || 'Could not load reports');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [statusFilter]);

  async function resolve(id: string, action: 'ACTIONED' | 'DISMISSED') {
    try {
      await apiSend(`/api/chat/reports/${id}/resolve`, 'POST', { action });
      toast.success(action === 'ACTIONED' ? 'Message removed' : 'Report dismissed');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Could not resolve report');
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/chat" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to chat
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-100 p-2 text-amber-700"><ShieldAlert className="h-5 w-5" /></div>
          <h1 className="text-xl font-semibold text-slate-900">Chat moderation</h1>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="ACTIONED">Actioned</SelectItem>
            <SelectItem value="DISMISSED">Dismissed</SelectItem>
            <SelectItem value="ALL">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {loading ? <p className="text-sm text-slate-400">Loading…</p> :
          reports.length === 0 ? <p className="rounded-lg border border-dashed border-slate-200 py-16 text-center text-sm text-slate-400">No reports.</p> :
          reports.map((r) => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">{r.message.sender}</span>
                    <Badge className={STATUS_STYLES[r.status] ?? ''}>{r.status}</Badge>
                    <span className="text-xs text-slate-400">{format(new Date(r.message.createdAt), 'd MMM yyyy HH:mm')}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">{r.message.body}</p>
                  {r.reason && <p className="mt-1 text-xs text-slate-500">Reason: {r.reason}</p>}
                  <Link to="/chat" className="mt-1 inline-block text-xs text-aubergine-600 hover:underline">Open conversation</Link>
                </div>
                {r.status === 'OPEN' && (
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="outline" className="text-rose-600" onClick={() => resolve(r.id, 'ACTIONED')}>
                      <Trash2 className="mr-1 h-4 w-4" /> Remove
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => resolve(r.id, 'DISMISSED')}>
                      <Check className="mr-1 h-4 w-4" /> Dismiss
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
