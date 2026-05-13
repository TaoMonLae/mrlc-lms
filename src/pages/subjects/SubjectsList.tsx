import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, BookOpen, MoreVertical, Archive, CheckCircle2, Book } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Subject } from '../../types/subject';
import { toast } from 'sonner';

const MOCK_SUBJECTS: Subject[] = [
  {
    id: 's1',
    name: 'Mathematical Reasoning',
    code: 'GED-MATH',
    description: 'GED Mathematical Reasoning focuses on quantitative problem solving and algebraic problem solving.',
    level: 'Advanced',
    status: 'ACTIVE',
  },
  {
    id: 's2',
    name: 'Reasoning Through Language Arts',
    code: 'GED-RLA',
    description: 'Focuses on reading comprehension, analyzing arguments, and writing skills.',
    level: 'Advanced',
    status: 'ACTIVE',
  },
  {
    id: 's3',
    name: 'Science',
    code: 'GED-SCI',
    description: 'Covers life science, physical science, and earth and space science.',
    level: 'Advanced',
    status: 'ACTIVE',
  },
  {
    id: 's4',
    name: 'Social Studies',
    code: 'GED-SS',
    description: 'Covers civics and government, US history, economics, and geography.',
    level: 'Advanced',
    status: 'ACTIVE',
  },
  {
    id: 's5',
    name: 'English Grammar',
    code: 'ENG-101',
    description: 'Foundational English grammar, vocabulary, and sentence structures.',
    level: 'Foundation',
    status: 'ACTIVE',
  },
  {
    id: 's6',
    name: 'Chinese',
    code: 'CHN-101',
    description: 'Introductory Mandarin Chinese language learning.',
    level: 'Intermediate',
    status: 'ARCHIVED',
  }
];

export default function SubjectsList() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Hardcoded for demo - should come from auth
  const userRole = 'ADMIN';

  const filteredSubjects = MOCK_SUBJECTS.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.level.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Subject Management</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Manage academic subjects and curriculum.</p>
        </div>
        {userRole === 'ADMIN' && (
          <Button className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto" render={<Link to="/subjects/new" />} nativeButton={false}>
            <Plus className="mr-2 h-4 w-4" />
            Add Subject
          </Button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search by name, code, or level..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSubjects.map(sub => (
          <div key={sub.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3">
                  <div className="mt-1 bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg">
                    <Book className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                      <Link to={`/subjects/${sub.id}`} className="hover:text-orange-600 hover:underline">{sub.name}</Link>
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs text-slate-500 font-normal">{sub.code}</Badge>
                      <span className="text-xs text-slate-400">• {sub.level}</span>
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-8 w-8 p-0" />} nativeButton={true}>
                    <MoreVertical className="h-4 w-4 text-slate-400" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                      <DropdownMenuItem render={<Link to={`/subjects/${sub.id}`} className="flex w-full" />} nativeButton={false}>View Dashboard</DropdownMenuItem>
                      {userRole === 'ADMIN' && (
                        <DropdownMenuItem render={<Link to={`/subjects/${sub.id}/edit`} className="flex w-full" />} nativeButton={false}>Edit Subject</DropdownMenuItem>
                      )}
                    </DropdownMenuGroup>
                    {userRole === 'ADMIN' && (
                      <React.Fragment>
                        <DropdownMenuSeparator />
                        {sub.status === 'ACTIVE' ? (
                          <DropdownMenuItem className="text-amber-600 focus:text-amber-600 focus:bg-amber-50">
                            <Archive className="mr-2 h-4 w-4" /> Archive Subject
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem className="text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50">
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Restore Subject
                          </DropdownMenuItem>
                        )}
                      </React.Fragment>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 h-10 mt-2">
                {sub.description}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/30 p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-sm">
              <Badge variant={sub.status === 'ACTIVE' ? 'default' : 'secondary'} 
                className={sub.status === 'ACTIVE' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-500 hover:bg-slate-600'}
              >
                {sub.status}
              </Badge>
              <div className="flex space-x-3 text-xs text-slate-500">
                 {/* Placeholders for assigned classes/teachers counts */}
                 <span>2 Classes</span>
                 <span>3 Teachers</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredSubjects.length === 0 && (
        <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
          <BookOpen className="h-12 w-12 mx-auto text-slate-200 mb-3" />
          <p className="text-lg font-medium text-slate-900 dark:text-white">No subjects found</p>
          <p className="text-sm text-slate-500">Try adjusting your filters or search term.</p>
        </div>
      )}
    </div>
  );
}
