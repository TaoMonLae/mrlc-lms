import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  MoreVertical, 
  Download, 
  Trash2, 
  Edit2, 
  File, 
  FileImage, 
  Shield, 
  Calendar,
  AlertCircle,
  FileCheck,
  Search,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { usePermissions } from '@/src/lib/permissions';
import { format, isPast, isWithinInterval, addDays } from 'date-fns';
import { toast } from 'sonner';

// Types
export type DocumentType = 
  | 'UNHCR' 
  | 'PASSPORT' 
  | 'BIRTH_CERTIFICATE' 
  | 'SCHOOL_RECORD' 
  | 'GUARDIAN_DOC' 
  | 'MEDICAL' 
  | 'OTHER';

export interface StudentDocument {
  id: string;
  studentId: string;
  title: string;
  documentType: DocumentType;
  fileUrl: string;
  fileName: string;
  fileSize: number; // in bytes
  mimeType: string;
  expiryDate?: string;
  uploadedById: string;
  uploadedByName: string;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
}

// Helper to get icon based on mime type
const getFileIcon = (mimeType: string) => {
  if (mimeType.includes('image')) return <FileImage className="h-8 w-8 text-blue-500" />;
  if (mimeType.includes('pdf')) return <FileText className="h-8 w-8 text-rose-500" />;
  return <File className="h-8 w-8 text-slate-400" />;
};

// Helper to format file size
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface StudentDocumentsProps {
  studentId: string;
}

export function StudentDocuments({ studentId }: StudentDocumentsProps) {
  const { isAdmin, hasPermission } = usePermissions();
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter based on user request "ADMIN can manage, TEACHER can view if allowed"
  const canManage = isAdmin || hasPermission('manage_documents');
  const canView = isAdmin || hasPermission('view_documents');

  useEffect(() => {
    if (!studentId || !canView) {
      setLoading(false);
      return;
    }
    const fetchDocuments = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch(`/api/students/${studentId}/documents`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch documents');
        const data = await res.json();
        setDocuments(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching student documents:', error);
        toast.error('Failed to load documents');
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, [studentId, canView]);

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: filteredDocs.length,
    expired: filteredDocs.filter(d => d.expiryDate && isPast(new Date(d.expiryDate))).length,
    expiringSoon: filteredDocs.filter(d => {
      if (!d.expiryDate) return false;
      const date = new Date(d.expiryDate);
      return !isPast(date) && isWithinInterval(date, {
        start: new Date(),
        end: addDays(new Date(), 30)
      });
    }).length
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/students/${studentId}/documents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      setDocuments(prev => prev.filter(d => d.id !== id));
      toast.success('Document deleted successfully');
    } catch {
      toast.error('Failed to delete document');
    }
  };

  const handleDownload = (doc: StudentDocument) => {
    if (doc.fileUrl && doc.fileUrl !== '#') {
      window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
    } else {
      toast.info(`No file available for ${doc.fileName}`);
    }
  };

  if (!canView) {
    return (
      <div className="p-8 text-center bg-slate-50 dark:bg-surface-indigo/50 rounded-xl border border-dashed border-slate-300 dark:border-surface-raised">
        <Shield className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Strict Access Only</h3>
        <p className="text-sm text-slate-500 mt-2">You don't have permission to view this student's private documents.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search & Stats Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search documents by title or file name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 border-slate-200 dark:border-surface-raised focus:ring-aubergine-500"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="h-9 px-3 border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/50 flex gap-2 items-center">
            <FileCheck className="h-3.5 w-3.5" />
            {stats.total} Total
          </Badge>
          
          {stats.expired > 0 && (
            <Badge variant="outline" className="h-9 px-3 border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/50 flex gap-2 items-center">
              <AlertCircle className="h-3.5 w-3.5" />
              {stats.expired} Expired
            </Badge>
          )}

          {stats.expiringSoon > 0 && (
            <Badge variant="outline" className="h-9 px-3 border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/50 flex gap-2 items-center">
              <Calendar className="h-3.5 w-3.5" />
              {stats.expiringSoon} Expiring Soon
            </Badge>
          )}

          {canManage && (
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground h-11" onClick={() => toast.info('Upload feature would open here')}>
              <Plus className="mr-2 h-4 w-4" /> Upload Document
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && (
          <div className="col-span-full py-20 text-center text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            Loading documents...
          </div>
        )}

        {!loading && filteredDocs.map((doc) => {
          const isExpired = doc.expiryDate && isPast(new Date(doc.expiryDate));
          const isExpiring = doc.expiryDate && !isExpired && isWithinInterval(new Date(doc.expiryDate), {
            start: new Date(),
            end: addDays(new Date(), 30)
          });

          return (
            <Card key={doc.id} className={`group border-slate-200 dark:border-surface-raised shadow-sm hover:shadow-md transition-all relative overflow-hidden ${isExpired ? 'bg-rose-50/10' : ''}`}>
              {/* Expiry Stripe */}
              {isExpired && <div className="absolute top-0 left-0 w-full h-1 bg-rose-500" />}
              {isExpiring && <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />}

              <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                <div className="flex gap-4">
                  <div className="mt-1">
                    {getFileIcon(doc.mimeType)}
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                      {doc.title}
                    </CardTitle>
                    <CardDescription className="text-xs font-medium text-slate-500 dark:text-slate-300 mt-1 uppercase tracking-wider">
                      {doc.documentType.replace('_', ' ')}
                    </CardDescription>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-white" />}>
                    <MoreVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => handleDownload(doc)}>
                      <Download className="mr-2 h-4 w-4" /> Download
                    </DropdownMenuItem>
                    {canManage && (
                      <>
                        <DropdownMenuItem onClick={() => toast.info('Rename logic')}>
                          <Edit2 className="mr-2 h-4 w-4" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-rose-600" onClick={() => handleDelete(doc.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="bg-slate-50 dark:bg-surface-raised/50 p-2.5 rounded-lg border border-slate-100 dark:border-surface-raised">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2 truncate">
                    <span className="truncate">{doc.fileName}</span>
                    <span className="shrink-0 text-[10px] text-slate-400 font-bold">• {formatFileSize(doc.fileSize)}</span>
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-500">Uploaded</span>
                    <span className="text-slate-900 dark:text-slate-300">{format(new Date(doc.createdAt), 'MMM d, yyyy')}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-500">Expiry</span>
                    {doc.expiryDate ? (
                      <div className="flex items-center gap-1.5">
                        <span className={`
                          ${isExpired ? 'text-rose-600' : isExpiring ? 'text-amber-600' : 'text-slate-900 dark:text-slate-300'}
                        `}>
                          {format(new Date(doc.expiryDate), 'MMM d, yyyy')}
                        </span>
                        {isExpired && <Badge variant="destructive" className="h-4 px-1 text-[8px] uppercase tracking-tighter">Expired</Badge>}
                        {isExpiring && <Badge variant="secondary" className="h-4 px-1 text-[8px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 uppercase tracking-tighter">Due Soon</Badge>}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">No expiry</span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-surface-raised flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-slate-100 dark:bg-surface-raised flex items-center justify-center text-[10px] font-bold text-slate-500">
                    {doc.uploadedByName.charAt(0)}
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">By {doc.uploadedByName}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {!loading && filteredDocs.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white dark:bg-surface-indigo rounded-xl border border-dashed border-slate-300 dark:border-surface-raised">
            <FileText className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No documents found</h3>
            <p className="text-sm text-slate-500 mt-2">Upload student documents to keep them organized.</p>
            {canManage && (
              <Button variant="outline" className="mt-6 font-bold" onClick={() => toast.info('Upload feature')}>
                <Plus className="mr-2 h-4 w-4" /> Upload First Document
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Info Warning */}
      <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 flex gap-4 items-start">
        <Shield className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 dark:text-blue-400 leading-relaxed">
          <p className="font-bold uppercase tracking-widest mb-1 text-[10px]">Security Notice</p>
          <p>These documents contain PII (Personally Identifiable Information). Access is logged, and unauthorized downloads are strictly prohibited as per school policy.</p>
        </div>
      </div>
    </div>
  );
}
