import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { ArrowLeft, Edit2, Trash2, Download, ExternalLink, FileText, Image as ImageIcon, Video, Link as LinkIcon, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '../../lib/permissions';
import { format } from 'date-fns';
import { toast } from 'sonner';

type LibraryResource = {
  id: string;
  title: string;
  author?: string | null;
  description?: string | null;
  type: string;
  externalUrl?: string | null;
  classId?: string | null;
  visibility?: string | null;
  createdAt: string;
  mimeType?: string | null;
};

export default function LibraryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isTeacher } = usePermissions();

  const [resource, setResource] = useState<LibraryResource | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    // Refresh the scoped library-media cookie so the embedded iframe + the
    // "Open" link (both unauthenticated browser requests) can read the file.
    const mediaToken = sessionStorage.getItem('auth_token');
    if (mediaToken) {
      fetch('/api/library/media-session', { method: 'POST', headers: { Authorization: `Bearer ${mediaToken}` } }).catch(() => {});
    }
    const fetchResource = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch(`/api/library/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (res.status === 404) {
            setResource(null);
          } else if (res.status === 401 || res.status === 403) {
            toast.error('You do not have permission to view this resource');
          } else {
            throw new Error('Failed to fetch resource');
          }
          return;
        }
        const data = await res.json();
        setResource(data);
      } catch (error) {
        console.error('Error fetching library resource:', error);
        toast.error('Failed to load resource');
      } finally {
        setLoading(false);
      }
    };
    fetchResource();
  }, [id]);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'PDF': return <FileText className="text-red-500 h-8 w-8" />;
      case 'IMAGE': return <ImageIcon className="text-blue-500 h-8 w-8" />;
      case 'VIDEO': return <Video className="text-accent-purple h-8 w-8" />;
      case 'LINK': return <LinkIcon className="text-emerald-500 h-8 w-8" />;
      case 'DOCUMENT': return <File className="text-blue-700 h-8 w-8" />;
      default: return <File className="text-muted-foreground h-8 w-8" />;
    }
  };

  const getEmbedUrl = (url: string | undefined | null) => {
    if (!url) return null;
    try {
      const u = new URL(url);
      // YouTube
      if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
        let videoId = u.searchParams.get('v');
        if (!videoId && u.hostname === 'youtu.be') videoId = u.pathname.slice(1);
        if (videoId) {
          // Use privacy-enhanced embed and comprehensive parameters to avoid Error 153
          const params = new URLSearchParams({
            rel: '0',              // Don't show related videos from other channels
            enablejsapi: '1',      // Enable JavaScript API
            widgetid: '1',         // Widget identifier
            origin: window.location.origin, // Current origin for security
            autoplay: '0',         // Don't autoplay
            modestbranding: '1',   // Minimal branding
            playsinline: '1',      // Play inline on mobile
            fs: '1',               // Allow fullscreen
          });
          return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
        }
      }
      // Vimeo
      if (u.hostname.includes('vimeo.com')) {
        const videoId = u.pathname.split('/').pop();
        if (videoId) return `https://player.vimeo.com/video/${videoId}`;
      }
    } catch {
      // Fallback to regex for URL strings that can't be parsed
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
      const match = url.match(youtubeRegex);
      if (match && match[1]) {
        const params = new URLSearchParams({
          rel: '0',
          enablejsapi: '1',
          widgetid: '1',
          origin: window.location.origin,
          autoplay: '0',
          modestbranding: '1',
          playsinline: '1',
          fs: '1',
        });
        return `https://www.youtube-nocookie.com/embed/${match[1]}?${params.toString()}`;
      }
    }
    return null;
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this resource?")) return;
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/library/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success("Resource deleted");
      navigate("/library");
    } catch {
      toast.error("Failed to delete resource");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-muted-foreground">Loading resource...</span>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-10">
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-muted-foreground hover:text-foreground" render={<Link to="/library" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Library
        </Button>
        <div className="rounded-sm border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          Resource not found.
        </div>
      </div>
    );
  }

  const canManage = isAdmin || isTeacher;
  const embedUrl = getEmbedUrl(resource.externalUrl);

  const fileUrl = resource.externalUrl || '';
  const extension = fileUrl.split('?')[0].split('.').pop()?.toLowerCase() || '';
  const isSelfHosted = fileUrl.startsWith('/uploads/library/');
  const isPdf = resource.mimeType === 'application/pdf' || extension === 'pdf';
  const isImage = (resource.mimeType || '').startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension);
  const isSelfHostedVideo = isSelfHosted && ((resource.mimeType || '').startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov'].includes(extension));

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-muted-foreground hover:text-foreground" render={<Link to="/library" />} nativeButton={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Button>
          <div className="flex items-center gap-3">
             <div className="p-3 bg-card rounded-sm border border-border shadow-sm">
                {getIconForType(resource.type)}
             </div>
             <div>
               <h1 className="text-2xl font-bold tracking-tight text-foreground">{resource.title}</h1>
               <div className="flex flex-wrap items-center gap-2 mt-2">
                 <Badge variant="secondary" className="font-normal">{resource.type}</Badge>
                 {resource.visibility === 'TEACHERS_ONLY' ? (
                   <Badge variant="outline" className="font-normal border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-400">
                     Internal Staff Only
                   </Badge>
                 ) : (
                   <Badge variant="outline" className="font-normal border-border text-muted-foreground">
                     Visible to Students
                   </Badge>
                 )}
               </div>
             </div>
          </div>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" render={<Link to={`/library/${resource.id}/edit`} />} nativeButton={false}>
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
          <div className="bg-card border border-border rounded-sm overflow-hidden shadow-sm">
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
            ) : isPdf ? (
              <div className="h-[75vh] w-full bg-muted">
                <iframe src={fileUrl} title={resource.title} className="w-full h-full border-0"></iframe>
              </div>
            ) : isImage ? (
              <div className="flex items-center justify-center bg-muted/50 p-4">
                <img src={fileUrl} alt={resource.title} className="max-h-[75vh] w-auto max-w-full rounded-lg" />
              </div>
            ) : isSelfHostedVideo ? (
              <div className="w-full bg-black">
                <video src={fileUrl} controls className="w-full max-h-[75vh]" />
              </div>
            ) : (
              <div className="p-12 flex flex-col items-center justify-center text-center bg-muted/50">
                {getIconForType(resource.type)}
                <h3 className="mt-4 text-lg font-medium text-foreground">Preview not available</h3>
                <p className="text-muted-foreground mt-1 max-w-sm">This file type cannot be previewed directly in the browser.</p>
                {resource.externalUrl && (
                  <div className="mt-6">
                    <Button render={<a href={resource.externalUrl} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
                         <ExternalLink className="mr-2 h-4 w-4" /> {resource.type === 'LINK' || resource.type === 'VIDEO' ? 'Open Link' : 'Open File'}
                    </Button>
                  </div>
                )}
              </div>
            )}
            {(isPdf || isImage || isSelfHostedVideo) && resource.externalUrl && (
              <div className="flex justify-end p-3 border-t border-border">
                <Button variant="outline" size="sm" render={<a href={resource.externalUrl} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
                  <Download className="mr-2 h-4 w-4" /> Download
                </Button>
              </div>
            )}

            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">Description</h3>
              <p className="text-foreground whitespace-pre-wrap">{resource.description || 'No description available.'}</p>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-sm shadow-sm p-6 overflow-hidden">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">Information</h3>

            <dl className="space-y-4">
              {resource.author && (
                <div>
                  <dt className="text-xs text-muted-foreground">Author</dt>
                  <dd className="font-medium text-foreground">{resource.author}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted-foreground">Date Added</dt>
                <dd className="font-medium text-foreground">{format(new Date(resource.createdAt), 'MMMM d, yyyy')}</dd>
              </div>
              {resource.classId && (
                <div>
                  <dt className="text-xs text-muted-foreground">Assigned Class</dt>
                  <dd className="font-medium text-blue-600 dark:text-blue-400">
                    <Link to={`/classes/${resource.classId}`} className="hover:underline">View Class</Link>
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
