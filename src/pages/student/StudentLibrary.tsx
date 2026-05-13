import React, { useState } from 'react';
import { 
  Library, 
  Search, 
  Filter, 
  BookOpen, 
  Download, 
  Eye, 
  FileText, 
  FileVideo, 
  FileImage,
  Star,
  Clock,
  MoreVertical,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

export default function StudentLibrary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [subject, setSubject] = useState('All');

  const resources = [
    { id: '1', title: 'Algebra Equations Explained', subject: 'Math', type: 'PDF', size: '2.4 MB', date: '2024-05-12', format: 'document' },
    { id: '2', title: 'Introduction to Mechanics', subject: 'Physics', type: 'Video', size: '15.8 MB', date: '2024-05-10', format: 'video' },
    { id: '3', title: 'WWII Part 1 Summary', subject: 'History', type: 'PDF', size: '1.1 MB', date: '2024-05-08', format: 'document' },
    { id: '4', title: 'Periodic Table Guide', subject: 'Chemistry', type: 'Image', size: '0.8 MB', date: '2024-05-05', format: 'image' },
    { id: '5', title: 'Linear Functions Workbook', subject: 'Math', type: 'XLSX', size: '0.5 MB', date: '2024-05-01', format: 'document' },
    { id: '6', title: 'Shakespeare Sonnets', subject: 'English', type: 'PDF', size: '1.8 MB', date: '2024-04-28', format: 'document' },
  ];

  const filteredResources = resources.filter(res => {
    const matchesSearch = res.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = subject === 'All' || res.subject === subject;
    return matchesSearch && matchesSubject;
  });

  const getFileIcon = (format: string) => {
    switch (format) {
      case 'video': return <FileVideo className="h-5 w-5 text-rose-500" />;
      case 'image': return <FileImage className="h-5 w-5 text-emerald-500" />;
      default: return <FileText className="h-5 w-5 text-indigo-500" />;
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Library className="h-6 w-6 text-indigo-600" />
            Digital Library
          </h1>
          <p className="text-sm text-slate-500 mt-1">Access study materials, recorded lectures, and research papers.</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search resources by title..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 border-slate-200 dark:border-slate-800 focus:ring-indigo-600"
          />
        </div>
        <div className="flex items-center gap-3">
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="w-[160px] h-10 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5" />
                <SelectValue placeholder="All Subjects" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Subjects</SelectItem>
              <SelectItem value="Math">Mathematics</SelectItem>
              <SelectItem value="Physics">Physics</SelectItem>
              <SelectItem value="English">English</SelectItem>
              <SelectItem value="History">History</SelectItem>
              <SelectItem value="Chemistry">Chemistry</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResources.map((res) => (
          <Card key={res.id} className="group border-slate-200 dark:border-slate-800 hover:shadow-md transition-all overflow-hidden bg-white dark:bg-slate-900">
            <CardHeader className="pb-3 border-b border-slate-50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                  {getFileIcon(res.format)}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 group-hover:text-indigo-600 transition-colors">
                  <Star className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3">
                <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 transition-colors">{res.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[9px] uppercase tracking-widest font-bold border-none bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 h-4 px-1.5">{res.subject}</Badge>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter tabular-nums">{res.size}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Updated {res.date}</span>
                <span className="text-slate-300">|</span>
                <span>Type: {res.type}</span>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-widest gap-2">
                  <Download className="h-3.5 w-3.5" /> Download
                </Button>
                <Button variant="outline" className="h-9 font-bold text-[10px] uppercase tracking-widest border-slate-200 dark:border-slate-800 hover:bg-slate-50 bg-transparent">
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredResources.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <BookOpen className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold">No resources matched</h3>
            <p className="text-sm text-slate-500 mt-1">Try adjusting your filters or search term.</p>
          </div>
        )}
      </div>

      {/* Recently Viewed / Study Groups Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-5 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/30 flex items-start gap-4">
          <BookOpen className="h-6 w-6 text-emerald-600" />
          <div>
            <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-400 uppercase tracking-widest mb-1">Assigned Reading</h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">Your Economics teacher has assigned "Intro to Micro" as a mandatory reading for next Monday's quiz.</p>
            <Button variant="link" className="p-0 h-auto text-[10px] font-bold text-emerald-600 mt-2 uppercase tracking-widest decoration-emerald-600/30">Open Assigned File <ChevronRight className="h-3 w-3" /></Button>
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-start gap-4">
          <FileText className="h-6 w-6 text-indigo-500" />
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-300 uppercase tracking-widest mb-1">Copyright Notice</h4>
            <p className="text-xs text-slate-500 leading-relaxed">These materials are for private study only. Redistribution to third parties or online platforms is strictly prohibited.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
