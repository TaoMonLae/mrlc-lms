import React, { useEffect, useMemo, useState } from 'react';
import {
  Library,
  Search,
  Filter,
  BookOpen,
  ExternalLink,
  FileText,
  FileVideo,
  FileImage,
  File as FileIcon,
  Link as LinkIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface Resource {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  externalUrl?: string | null;
  visibility?: string | null;
  createdAt?: string;
}

function getFileIcon(type: string) {
  switch ((type || '').toUpperCase()) {
    case 'VIDEO':
      return <FileVideo className="h-5 w-5 text-rose-500" />;
    case 'IMAGE':
      return <FileImage className="h-5 w-5 text-emerald-500" />;
    case 'LINK':
      return <LinkIcon className="h-5 w-5 text-sky-500" />;
    case 'PDF':
    case 'DOCUMENT':
      return <FileText className="h-5 w-5 text-aubergine-500" />;
    default:
      return <FileIcon className="h-5 w-5 text-slate-500" />;
  }
}

export default function StudentLibrary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch('/api/library', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load library');
        setResources(await res.json());
      } catch (error: any) {
        toast.error(error.message || 'Failed to load library');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const types = useMemo(() => {
    const set = new Set(resources.map((r) => (r.type || 'OTHER').toUpperCase()));
    return ['All', ...Array.from(set)];
  }, [resources]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return resources.filter((r) => {
      const matchesSearch =
        !q ||
        r.title.toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q);
      const matchesType = typeFilter === 'All' || (r.type || '').toUpperCase() === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [resources, searchTerm, typeFilter]);

  const openResource = (r: Resource) => {
    if (!r.externalUrl) {
      toast.info('No file or link is attached to this resource yet.');
      return;
    }
    window.open(r.externalUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Library className="h-6 w-6 text-aubergine-600" />
            Digital Library
          </h1>
          <p className="text-sm text-slate-500 mt-1">Access study materials, recorded lectures, and reading resources.</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-surface-indigo p-4 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search resources by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 border-slate-200 dark:border-surface-raised focus:ring-aubergine-600"
          />
        </div>
        <div className="flex items-center gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] h-10 border-slate-200 dark:border-surface-raised">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5" />
                <SelectValue placeholder="All Types" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t} value={t}>{t === 'All' ? 'All Types' : t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Resources Grid */}
      {loading ? (
        <div className="py-20 text-center text-sm text-slate-500">Loading library…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((res) => (
            <Card key={res.id} className="group border-slate-200 dark:border-surface-raised hover:shadow-md transition-all overflow-hidden bg-white dark:bg-surface-indigo">
              <CardHeader className="pb-3 border-b border-slate-50 dark:border-surface-raised/50 bg-slate-50/50 dark:bg-surface-raised/30">
                <div className="flex justify-between items-start">
                  <div className="p-2.5 bg-white dark:bg-surface-raised rounded-xl shadow-sm border border-slate-100 dark:border-surface-raised">
                    {getFileIcon(res.type)}
                  </div>
                  <Badge variant="outline" className="text-[9px] uppercase tracking-widest font-bold border-none bg-aubergine-50 text-aubergine-700 dark:bg-aubergine-900/30 dark:text-aubergine-400 h-4 px-1.5">
                    {(res.type || 'OTHER').toUpperCase()}
                  </Badge>
                </div>
                <div className="mt-3">
                  <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-aubergine-600 transition-colors">{res.title}</h3>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <p className="text-xs text-slate-500 line-clamp-2 min-h-[2rem]">{res.description || 'No description provided.'}</p>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    className="flex-1 h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] uppercase tracking-widest gap-2 disabled:opacity-50"
                    onClick={() => openResource(res)}
                    disabled={!res.externalUrl}
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> {res.externalUrl ? 'Open / Read' : 'No File'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white dark:bg-surface-indigo rounded-2xl border border-dashed border-slate-200 dark:border-surface-raised">
              <BookOpen className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold">No resources found</h3>
              <p className="text-sm text-slate-500 mt-1">
                {resources.length === 0 ? 'Your teachers have not shared any resources yet.' : 'Try adjusting your search or filter.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Copyright Notice */}
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-surface-raised">
        <div className="bg-slate-50 dark:bg-surface-raised/50 p-5 rounded-2xl border border-slate-100 dark:border-surface-raised flex items-start gap-4">
          <FileText className="h-6 w-6 text-aubergine-500" />
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-300 uppercase tracking-widest mb-1">Copyright Notice</h4>
            <p className="text-xs text-slate-500 leading-relaxed">These materials are for private study only. Redistribution to third parties or online platforms is strictly prohibited.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
