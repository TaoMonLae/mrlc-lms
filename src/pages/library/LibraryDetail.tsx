import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Download, ExternalLink, Shield, FileText, Image as ImageIcon, Video, Link as LinkIcon, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePermissions, useUser } from '../../lib/permissions';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Reusing MOCK_RESOURCES logic for demo
const MOCK_RESOURCE = {
  id: 'r3',
  title: 'Introduction to React',
  description: 'A great tutorial on React fundamentals. This covers components, state, props, and hooks. Ensure you follow along with the exercises.',
  type: 'VIDEO',
  externalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  fileUrl: undefined as string | undefined,
  classId: 'c1',
  visibility: 'ALL',
  uploadedById: 't1',
  uploadedByName: 'John Teacher',
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export default function LibraryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const { isAdmin, isTeacher } = usePermissions();

  const getIconForType = (type: string) => {
    switch (type) {
      case 'PDF': return <FileText className="text-red-500 h-8 w-8" />;
      case 'IMAGE': return <ImageIcon className="text-blue-500 h-8 w-8" />;
      case 'VIDEO': return <Video className="text-purple-500 h-8 w-8" />;
      case 'LINK': return <LinkIcon className="text-emerald-500 h-8 w-8" />;
      case 'DOCUMENT': return <File className="text-blue-700 h-8 w-8" />;
      default: return <File className="text-slate-500 h-8 w-8" />;
    }
  };

  const getEmbedUrl = (url: string | undefined) => {
    if (!url) return null;
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(youtubeRegex);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
    return null;
  };

  const canManage = isAdmin || (isTeacher && MOCK_RESOURCE.uploadedById === user?.id); // simplified

  const embedUrl = getEmbedUrl(MOCK_RESOURCE.externalUrl);

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this resource?")) {
      toast.success("Resource deleted");
      navigate("/library");
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/library" />} nativeButton={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Button>
          <div className="flex items-center gap-3">
             <div className="p-3 bg-white dark:bg-surface-indigo rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm">
                {getIconForType(MOCK_RESOURCE.type)}
             </div>
             <div>
               <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{MOCK_RESOURCE.title}</h1>
               <div className="flex flex-wrap items-center gap-2 mt-2">
                 <Badge variant="secondary" className="font-normal">{MOCK_RESOURCE.type}</Badge>
                 {MOCK_RESOURCE.visibility === 'TEACHERS_ONLY' ? (
                   <Badge variant="outline" className="font-normal border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-400">
                     Internal Staff Only
                   </Badge>
                 ) : (
                   <Badge variant="outline" className="font-normal border-slate-200 text-slate-600 dark:border-surface-raised dark:text-slate-300">
                     Visible to Students
                   </Badge>
                 )}
               </div>
             </div>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Button variant="outline" render={<Link to={`/library/${MOCK_RESOURCE.id}/edit`} />} nativeButton={false}>
              <Edit2 className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl overflow-hidden shadow-sm">
            {embedUrl ? (
              <div className="aspect-video w-full">
                <iframe
                  src={embedUrl}
                  title="Video player"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            ) : MOCK_RESOURCE.type === 'IMAGE' && MOCK_RESOURCE.fileUrl ? (
               <div className="p-4 bg-slate-100 dark:bg-canvas flex justify-center">
                 <img src={MOCK_RESOURCE.fileUrl} alt={MOCK_RESOURCE.title} className="max-w-full max-h-[600px] object-contain rounded drop-shadow-sm" />
               </div>
            ) : (
              <div className="p-12 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-surface-indigo/50">
                {getIconForType(MOCK_RESOURCE.type)}
                <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">Preview not available</h3>
                <p className="text-slate-500 mt-1 max-w-sm">This file type cannot be previewed directly in the browser.</p>
                <div className="mt-6">
                  {MOCK_RESOURCE.externalUrl ? (
                    <Button render={<a href={MOCK_RESOURCE.externalUrl} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
                         <ExternalLink className="mr-2 h-4 w-4" /> Open External Link
                    </Button>
                  ) : (
                    <Button>
                      <Download className="mr-2 h-4 w-4" /> Download File (12.4 MB)
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Description</h3>
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{MOCK_RESOURCE.description}</p>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm p-6 overflow-hidden">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-surface-raised pb-2">Information</h3>
            
            <dl className="space-y-4">
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-300">Uploaded By</dt>
                <dd className="font-medium text-slate-900 dark:text-white">{MOCK_RESOURCE.uploadedByName}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-300">Date Added</dt>
                <dd className="font-medium text-slate-900 dark:text-white">{format(new Date(MOCK_RESOURCE.createdAt), 'MMMM d, yyyy')}</dd>
              </div>
              {MOCK_RESOURCE.classId && (
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-300">Assigned Class</dt>
                  <dd className="font-medium text-blue-600 dark:text-blue-400">
                    <Link to={`/classes/${MOCK_RESOURCE.classId}`} className="hover:underline">Grade 10A</Link>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

      </div>
    </div>
  );
}
