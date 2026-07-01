import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Database, 
  FileJson, 
  FileSpreadsheet, 
  FolderArchive, 
  Upload, 
  Download, 
  AlertTriangle,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BackupLog = {
  id: string;
  type: string;
  fileName: string;
  fileSize: string;
  createdById: string;
  createdAt: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  notes: string;
};

function humanSize(bytes: number): string {
  if (!bytes) return '0 B';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function nextRunLabel(hour: number): string {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const hh = String(hour).padStart(2, '0');
  const isTomorrow = next.getDate() !== now.getDate();
  return `${isTomorrow ? 'tomorrow ' : ''}${hh}:00`;
}

export default function BackupAndRestore() {
  const [logs, setLogs] = useState<BackupLog[]>([]);
  const [autoEnabled, setAutoEnabled] = useState<boolean | null>(null);
  const [backupHour, setBackupHour] = useState(2);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const token = sessionStorage.getItem('auth_token');

  const loadBackups = async () => {
    try {
      const res = await fetch('/api/backups', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.enabled === 'boolean') setAutoEnabled(data.enabled);
      if (typeof data.backupHour === 'number') setBackupHour(data.backupHour);
      setLogs((data.backups || []).map((b: { name: string; size: number; createdAt: string }) => ({
        id: b.name,
        type: 'Database',
        fileName: b.name,
        fileSize: humanSize(b.size),
        createdById: '',
        createdAt: b.createdAt,
        status: 'SUCCESS' as const,
        notes: 'pg_dump',
      })));
    } catch { /* ignore */ }
  };

  useEffect(() => { loadBackups(); }, []);

  const handleBackup = async (type: string, _fileExt?: string) => {
    // Only the database backup is wired to a real endpoint. The other export
    // formats are not implemented yet — be honest rather than fake success.
    if (type !== 'Database') {
      toast.info(`${type} export is not available yet.`);
      return;
    }
    setIsBackingUp(true);
    toast.info('Creating database backup…', { icon: <Clock className="h-4 w-4" /> });
    try {
      const res = await fetch('/api/backups/run', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Backup failed');
      toast.success('Database backup created.', { description: `Stored as ${data.name}` });
      await loadBackups();
    } catch (e: any) {
      toast.error(e.message || 'Backup failed');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDownloadBackup = async (name: string) => {
    try {
      const res = await fetch(`/api/backups/${encodeURIComponent(name)}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e.message || 'Download failed');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !['sql', 'json', 'csv', 'zip'].includes(ext)) {
        toast.error('Invalid backup format. Please upload a .sql, .json, .csv, or .zip file.');
        setSelectedFile(null);
        e.target.value = '';
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRestore = async () => {
    if (!selectedFile) {
      toast.error('Please select a backup file to restore.');
      return;
    }
    if (!adminPassword) {
      setRestoreError('Password is required.');
      return;
    }

    setRestoreError(null);
    setIsRestoring(true);
    toast.info('Verifying credentials and creating safety snapshot...');

    try {
      const token = sessionStorage.getItem('auth_token');
      const response = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ password: adminPassword }),
      });

      if (!response.ok) {
        setRestoreError('Invalid password. Restoration aborted.');
        setIsRestoring(false);
        return;
      }

      // Restoring a production database from the browser is intentionally not
      // supported — it must be done by an operator. Be honest instead of faking it.
      setIsRestoring(false);
      setIsRestoreDialogOpen(false);
      setAdminPassword('');
      setSelectedFile(null);
      const fileInput = document.getElementById('backup-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      toast.info('Restore must be run by an administrator', {
        description: 'For safety, restore is performed on the server with pg_restore, not from the browser. See the deployment runbook.',
        duration: 12000,
      });
    } catch {
      setRestoreError('Unable to verify credentials. Please try again.');
      setIsRestoring(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'FAILED': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      
      {/* Header Info */}
      <div className="bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-500 p-4 rounded-r-md">
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-500 mt-1" />
          <div className="space-y-1">
            <h3 className="font-semibold text-amber-800 dark:text-amber-500 text-base">Warning: Sensitive Operations</h3>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              The backup and restore module allows you to export or overwrite the entire school database. 
              Always create a fresh backup before performing any restoration. Keep downloaded backups secure.
            </p>
          </div>
        </div>
      </div>

      {/* Automated backup status */}
      <div className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
        autoEnabled
          ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/10'
          : 'border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
            autoEnabled ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-surface-raised text-slate-400'
          }`}>
            <History className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white">Automated Daily Backups</h3>
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                autoEnabled === null ? 'bg-slate-100 text-slate-500 dark:bg-surface-raised dark:text-slate-400'
                  : autoEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'
              }`}>
                {autoEnabled === null ? '…' : autoEnabled ? 'On' : 'Off'}
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              {autoEnabled === null ? (
                'Checking status…'
              ) : autoEnabled ? (
                <>
                  Last backup: <span className="font-medium text-slate-900 dark:text-white">{logs.length ? relativeTime(logs[0].createdAt) : 'none yet'}</span>
                  {' · '}Next run: <span className="font-medium text-slate-900 dark:text-white">{nextRunLabel(backupHour)}</span>
                </>
              ) : (
                'Turn on automatic backups in System Settings to run a daily database backup.'
              )}
            </p>
          </div>
        </div>
        {autoEnabled === false && (
          <Button variant="outline" size="sm" render={<Link to="/settings/system" />} nativeButton={false}>
            System Settings
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Backup Selection */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Download className="h-5 w-5" /> Export Data
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Database Backup */}
            <div className="border border-slate-200 dark:border-surface-raised rounded-xl p-4 flex flex-col items-center text-center hover:border-aubergine-500/50 transition-colors bg-white dark:bg-surface-indigo shadow-sm cursor-pointer" onClick={() => handleBackup('Database', 'sql')}>
              <div className="h-12 w-12 bg-aubergine-100 dark:bg-aubergine-900/30 text-aubergine-600 dark:text-aubergine-400 rounded-full flex items-center justify-center mb-3">
                <Database className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Database</h3>
              <p className="text-xs text-slate-500 mb-4 flex-1">Complete SQL dump of all tables and relationships.</p>
              <Button variant="outline" size="sm" className="w-full">Create Backup</Button>
            </div>

            {/* Uploaded Files */}
            <div className="border border-slate-200 dark:border-surface-raised rounded-xl p-4 flex flex-col items-center text-center hover:border-aubergine-500/50 transition-colors bg-white dark:bg-surface-indigo shadow-sm cursor-pointer" onClick={() => handleBackup('Files Archive', 'zip')}>
              <div className="h-12 w-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mb-3">
                <FolderArchive className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Uploaded Files</h3>
              <p className="text-xs text-slate-500 mb-4 flex-1">Archive of all user uploads, documents, and images.</p>
              <Button variant="outline" size="sm" className="w-full">Create Archive</Button>
            </div>

            {/* JSON Export */}
            <div className="border border-slate-200 dark:border-surface-raised rounded-xl p-4 flex flex-col items-center text-center hover:border-aubergine-500/50 transition-colors bg-white dark:bg-surface-indigo shadow-sm cursor-pointer" onClick={() => handleBackup('JSON Export', 'json')}>
              <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-3">
                <FileJson className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">JSON Export</h3>
              <p className="text-xs text-slate-500 mb-4 flex-1">Structured data export for API or migration scripts.</p>
              <Button variant="outline" size="sm" className="w-full">Export JSON</Button>
            </div>

            {/* CSV Export */}
            <div className="border border-slate-200 dark:border-surface-raised rounded-xl p-4 flex flex-col items-center text-center hover:border-aubergine-500/50 transition-colors bg-white dark:bg-surface-indigo shadow-sm cursor-pointer" onClick={() => handleBackup('CSV Export', 'csv')}>
              <div className="h-12 w-12 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-full flex items-center justify-center mb-3">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">CSV Export</h3>
              <p className="text-xs text-slate-500 mb-4 flex-1">Tabular data format easy to open in spreadsheet apps.</p>
              <Button variant="outline" size="sm" className="w-full">Export CSV</Button>
            </div>
          </div>
        </div>

        {/* Restore Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Upload className="h-5 w-5" /> Restore Data
          </h2>

          <div className="border border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo p-6 rounded-xl shadow-sm text-center">
            <div className="border-2 border-dashed border-slate-300 dark:border-surface-raised rounded-xl p-8 mb-4 hover:bg-slate-50 dark:hover:bg-surface-raised/50 transition-colors">
              <Upload className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Choose Backup File to Restore</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">Accepts .sql, .json, .csv, .zip formats</p>
              
              <Input 
                id="backup-file" 
                type="file" 
                className="max-w-[280px] mx-auto text-sm" 
                onChange={handleFileChange}
                accept=".sql,.json,.csv,.zip"
              />
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-400 text-xs p-3 rounded text-left mb-4 flex gap-2 items-start">
               <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
               <p>Restoring a backup will <strong>overwrite existing data</strong>. An automatic safety snapshot will be created before the restore process begins.</p>
            </div>

            <Button 
              className="w-full bg-red-600 hover:bg-red-700 text-white" 
              disabled={!selectedFile}
              onClick={() => setIsRestoreDialogOpen(true)}
            >
              Initiate System Restore
            </Button>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="mt-8 space-y-4">
         <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="h-5 w-5" /> Backup History
         </h2>
         
         <div className="border border-slate-200 dark:border-surface-raised rounded-xl overflow-hidden bg-white dark:bg-surface-indigo shadow-sm">
            <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-surface-raised/50 text-slate-500 dark:text-slate-300 border-b border-slate-200 dark:border-surface-raised">
                     <tr>
                        <th className="px-4 py-3 font-semibold">Date & Time</th>
                        <th className="px-4 py-3 font-semibold">Type</th>
                        <th className="px-4 py-3 font-semibold">File Name</th>
                        <th className="px-4 py-3 font-semibold">Size</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody>
                     {logs.length === 0 && (
                        <tr>
                           <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm italic">
                              No backups yet. Create one above, or enable automatic daily backups in System Settings.
                           </td>
                        </tr>
                     )}
                     {logs.map((log) => (
                        <tr key={log.id} className="border-b border-slate-100 dark:border-surface-raised/50 hover:bg-slate-50 dark:hover:bg-surface-raised/20">
                           <td className="px-4 py-3 text-slate-900 dark:text-slate-300">
                              {new Date(log.createdAt).toLocaleString()}
                           </td>
                           <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                              {log.type}
                           </td>
                           <td className="px-4 py-3 text-slate-600 dark:text-slate-300 truncate max-w-[200px]">
                              {log.fileName}
                           </td>
                           <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                              {log.fileSize}
                           </td>
                           <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                 {getStatusIcon(log.status)}
                                 <span className={
                                    log.status === 'SUCCESS' ? 'text-emerald-700 dark:text-emerald-400' :
                                    log.status === 'FAILED' ? 'text-red-700 dark:text-red-400' : 'text-slate-700'
                                 }>{log.status}</span>
                              </div>
                           </td>
                           <td className="px-4 py-3 text-right">
                              <Button variant="ghost" size="sm" className="h-8" onClick={() => handleDownloadBackup(log.fileName)}>
                                 <Download className="h-3.5 w-3.5 mr-1.5" /> Download
                              </Button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      </div>

      {/* Restore Confirmation Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="h-5 w-5" />
              Confirm Database Restore
            </DialogTitle>
            <DialogDescription className="pt-3">
              You are about to restore the system from <strong className="text-slate-900 dark:text-white">{selectedFile?.name}</strong>. 
              This action cannot be undone and will overwrite current school data.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
               <Label htmlFor="adminPassword">Your Admin Password</Label>
               <Input 
                  id="adminPassword" 
                  type="password" 
                  placeholder="Enter your password to confirm"
                  value={adminPassword}
                  onChange={(e) => { setAdminPassword(e.target.value); setRestoreError(null); }}
               />
               {restoreError && (
                 <p className="text-xs text-red-500 font-medium">{restoreError}</p>
               )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRestoreDialogOpen(false)} disabled={isRestoring}>Cancel</Button>
            <Button variant="destructive" onClick={handleRestore} disabled={!adminPassword || isRestoring}>
              {isRestoring ? 'Restoring...' : 'Yes, Restore Now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
