import React, { useState } from 'react';
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

// Mock data
const mockBackupLogs: BackupLog[] = [
  {
    id: '1',
    type: 'Database',
    fileName: 'mrlc_db_backup_20250512.sql',
    fileSize: '45.2 MB',
    createdById: 'admin_user_1',
    createdAt: '2025-05-12T02:00:00Z',
    status: 'SUCCESS',
    notes: 'Scheduled auto backup'
  },
  {
    id: '2',
    type: 'JSON Export',
    fileName: 'mrlc_data_export_20250510.json',
    fileSize: '12.4 MB',
    createdById: 'admin_user_1',
    createdAt: '2025-05-10T14:30:00Z',
    status: 'SUCCESS',
    notes: 'Manual trigger'
  },
  {
    id: '3',
    type: 'Files Archive',
    fileName: 'documents_archive_20250501.zip',
    fileSize: '1.2 GB',
    createdById: 'admin_user_1',
    createdAt: '2025-05-01T01:00:00Z',
    status: 'FAILED',
    notes: 'Out of storage space'
  }
];

export default function BackupAndRestore() {
  const [logs, setLogs] = useState<BackupLog[]>(mockBackupLogs);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleBackup = (type: string, fileExt: string) => {
    // Simulate backup process
    toast.info(`Generating ${type} backup...`, { icon: <Clock className="h-4 w-4" /> });
    
    setTimeout(() => {
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-');
      const mockFileName = `mrlc_${type.toLowerCase().replace(/\s+/g, '_')}_${timestamp}.${fileExt}`;
      
      const newLog: BackupLog = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        fileName: mockFileName,
        fileSize: `${(Math.random() * 50 + 1).toFixed(1)} MB`,
        createdById: 'admin_user_1',
        createdAt: now.toISOString(),
        status: 'SUCCESS',
        notes: 'Manual backup'
      };
      
      setLogs([newLog, ...logs]);
      toast.success(`${type} backup created successfully!`, {
         description: `Stored as ${mockFileName}`
      });
    }, 2000);
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

  const handleRestore = () => {
    if (!selectedFile) {
      toast.error('Please select a backup file to restore.');
      return;
    }
    
    if (adminPassword !== 'admin123') { // Mock password check
      toast.error('Invalid admin password. Restoration aborted.');
      return;
    }

    // Auto backup before restore simulation
    toast.info('Creating safety snapshot before restore...');
    setIsRestoring(true);

    setTimeout(() => {
      setIsRestoring(false);
      setIsRestoreDialogOpen(false);
      setAdminPassword('');
      setSelectedFile(null);
      // Reset the input
      const fileInput = document.getElementById('backup-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      toast.success('System restored successfully!', {
        description: 'The system has been populated from your backup file.'
      });
    }, 3000);
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Backup Selection */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Download className="h-5 w-5" /> Export Data
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Database Backup */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col items-center text-center hover:border-orange-500/50 transition-colors bg-white dark:bg-slate-900 shadow-sm cursor-pointer" onClick={() => handleBackup('Database', 'sql')}>
              <div className="h-12 w-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-3">
                <Database className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Database</h3>
              <p className="text-xs text-slate-500 mb-4 flex-1">Complete SQL dump of all tables and relationships.</p>
              <Button variant="outline" size="sm" className="w-full">Create Backup</Button>
            </div>

            {/* Uploaded Files */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col items-center text-center hover:border-orange-500/50 transition-colors bg-white dark:bg-slate-900 shadow-sm cursor-pointer" onClick={() => handleBackup('Files Archive', 'zip')}>
              <div className="h-12 w-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mb-3">
                <FolderArchive className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Uploaded Files</h3>
              <p className="text-xs text-slate-500 mb-4 flex-1">Archive of all user uploads, documents, and images.</p>
              <Button variant="outline" size="sm" className="w-full">Create Archive</Button>
            </div>

            {/* JSON Export */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col items-center text-center hover:border-orange-500/50 transition-colors bg-white dark:bg-slate-900 shadow-sm cursor-pointer" onClick={() => handleBackup('JSON Export', 'json')}>
              <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-3">
                <FileJson className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">JSON Export</h3>
              <p className="text-xs text-slate-500 mb-4 flex-1">Structured data export for API or migration scripts.</p>
              <Button variant="outline" size="sm" className="w-full">Export JSON</Button>
            </div>

            {/* CSV Export */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col items-center text-center hover:border-orange-500/50 transition-colors bg-white dark:bg-slate-900 shadow-sm cursor-pointer" onClick={() => handleBackup('CSV Export', 'csv')}>
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

          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm text-center">
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 mb-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
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
         
         <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
            <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                     <tr>
                        <th className="px-4 py-3 font-semibold">Date & Time</th>
                        <th className="px-4 py-3 font-semibold">Type</th>
                        <th className="px-4 py-3 font-semibold">File Name</th>
                        <th className="px-4 py-3 font-semibold">Size</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                     </tr>
                  </thead>
                  <tbody>
                     {logs.map((log) => (
                        <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/20">
                           <td className="px-4 py-3 text-slate-900 dark:text-slate-300">
                              {new Date(log.createdAt).toLocaleString()}
                           </td>
                           <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                              {log.type}
                           </td>
                           <td className="px-4 py-3 text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
                              {log.fileName}
                           </td>
                           <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
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
               <Label htmlFor="adminPassword">Admin Password (try 'admin123')</Label>
               <Input 
                  id="adminPassword" 
                  type="password" 
                  placeholder="Enter password to confirm"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
               />
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
