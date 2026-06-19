import { useEffect, useState } from 'react';
import { fetchOrMock } from '../../lib/api';
import { Link } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Download, 
  Share2, 
  MoreHorizontal, 
  Search, 
  Upload, 
  File, 
  Image as ImageIcon, 
  Video, 
  Filter,
  Eye,
  Lock,
  Globe
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { toast } from "sonner";

interface ResourceRow {
  id: string; title: string; type: string; size: string; uploadedBy: string;
  date: string; visibility: string; downloads: number; url: string | null;
}

const MOCK_RESOURCES: ResourceRow[] = [
  { id: "r1", title: "GED Social Studies Study Guide", type: "PDF", size: "2.4 MB", uploadedBy: "You", date: "May 10, 2024", visibility: "PUBLIC", downloads: 45, url: null },
  { id: "r2", title: "Chemistry Lab Safety Video", type: "VIDEO", size: "45.1 MB", uploadedBy: "Sarah Wilson", date: "May 08, 2024", visibility: "TEACHERS", downloads: 12, url: null },
  { id: "r3", title: "Grade 10 Math Exercises", type: "DOCX", size: "1.1 MB", uploadedBy: "You", date: "May 05, 2024", visibility: "PRIVATE", downloads: 0, url: null },
  { id: "r4", title: "Historical Maps Collection", type: "ZIP", size: "128.5 MB", uploadedBy: "Robert Brown", date: "Apr 28, 2024", visibility: "PUBLIC", downloads: 89, url: null },
  { id: "r5", title: "English Grammar Worksheet", type: "PDF", size: "0.8 MB", uploadedBy: "You", date: "Apr 22, 2024", visibility: "PUBLIC", downloads: 156, url: null },
];

// Map a LibraryResource row from /api/library into this page's display shape.
function mapLibraryResource(r: any): ResourceRow {
  return {
    id: r.id,
    title: r.title,
    type: (r.type || 'FILE').toUpperCase(),
    size: '—',
    uploadedBy: r.author || '—',
    date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—',
    visibility: r.visibility || 'PUBLIC',
    downloads: 0,
    url: r.externalUrl || null,
  };
}

export default function TeacherLibrary() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [resources, setResources] = useState<ResourceRow[]>([]);

  useEffect(() => {
    fetchOrMock<any[]>('/api/library', MOCK_RESOURCES).then((r) => {
      setResources(r.source === 'live' ? r.data.map(mapLibraryResource) : (r.data as ResourceRow[]));
    });
  }, []);

  const filteredResources = resources.filter(r => 
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (typeFilter === "all" || r.type === typeFilter)
  );

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'PDF': return <FileText className="h-5 w-5 text-red-500" />;
      case 'VIDEO': return <Video className="h-5 w-5 text-blue-500" />;
      case 'IMAGE': return <ImageIcon className="h-5 w-5 text-emerald-500" />;
      case 'DOCX': return <File className="h-5 w-5 text-blue-600" />;
      case 'ZIP': return <File className="h-5 w-5 text-amber-600" />;
      default: return <File className="h-5 w-5 text-slate-400" />;
    }
  };

  const handleDownload = (resource: typeof resources[0]) => {
    if (resource.url) {
      // Real file — trigger browser download
      const a = document.createElement('a');
      a.href = resource.url;
      a.download = resource.title;
      a.click();
    } else {
      // Mock data — files not yet stored in backend
      toast.info(`"${resource.title}" is not yet stored on the server.`, {
        description: "File downloads will work once resources are uploaded through the Upload form.",
      });
    }
  };

  const handleShare = (resource: typeof resources[0]) => {
    const shareUrl = `${window.location.origin}/library/${resource.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success("Resource link copied to clipboard!");
    }).catch(() => {
      toast.error("Could not copy link. Please copy the URL manually.");
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white uppercase tracking-tighter">Teaching Resources</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Access shared materials and manage your own teaching uploads.</p>
        </div>
        {/* Upload button navigates to the shared /library/new page (TEACHER has manage_own_library) */}
        <Button
          id="upload-resource-btn"
          render={<Link to="/library/new" />}
          className="h-11 px-6 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-[11px] uppercase tracking-widest shadow-lg"
        >
          <Upload className="h-4 w-4 mr-2" /> Upload Resource
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search filenames, tags..." 
            className="pl-10 h-11 bg-white dark:bg-canvas border-slate-200 dark:border-surface-raised font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-11 w-full lg:w-40 border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Formats</SelectItem>
              <SelectItem value="PDF">PDF Documents</SelectItem>
              <SelectItem value="VIDEO">Videos</SelectItem>
              <SelectItem value="DOCX">Word Docs</SelectItem>
              <SelectItem value="ZIP">Archives</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 border-slate-200 dark:border-surface-raised">
            <Filter className="h-4 w-4 text-slate-500" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredResources.map((resource) => (
          <Card key={resource.id} className="group border-slate-200 dark:border-surface-raised hover:border-aubergine-200 hover:shadow-sm transition-all duration-200 overflow-hidden">
            <CardContent className="p-0 flex flex-col sm:flex-row items-center">
              <div className="p-5 flex items-center gap-4 flex-1 w-full">
                <div className="h-12 w-12 shrink-0 rounded-xl bg-slate-50 dark:bg-surface-raised flex items-center justify-center border border-slate-100 dark:border-surface-raised">
                  {getFileIcon(resource.type)}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-aubergine-600 transition-colors truncate uppercase text-sm tracking-tight">{resource.title}</h4>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                    <span>{resource.type}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span>{resource.size}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <div className="flex items-center gap-1">
                        {resource.visibility === 'PUBLIC' ? <Globe className="h-3 w-3" /> : resource.visibility === 'PRIVATE' ? <Lock className="h-3 w-3" /> : <Eye className="h-3 w-3 text-emerald-500" />}
                        {resource.visibility}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 flex items-center justify-between sm:justify-end gap-x-8 w-full sm:w-auto bg-slate-50/50 dark:bg-surface-raised/20 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-surface-raised">
                <div className="text-left sm:text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Uploaded By</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{resource.uploadedBy}</p>
                </div>
                <div className="text-left sm:text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Downloads</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{resource.downloads}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-slate-400 hover:text-aubergine-600"
                      title="Download resource"
                      onClick={() => handleDownload(resource)}
                    >
                        <Download className="h-4 w-4" />
                    </Button>
                    {resource.uploadedBy === 'You' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-slate-400 hover:text-blue-600"
                          title="Copy share link"
                          onClick={() => handleShare(resource)}
                        >
                            <Share2 className="h-4 w-4" />
                        </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-slate-400"
                      title="More options"
                      onClick={() => toast.info("More options coming soon.")}
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
