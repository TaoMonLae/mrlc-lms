import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, BookOpen, Clock, CheckCircle2, GraduationCap, Calendar, ArrowRight, MoreHorizontal, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiGet } from "../../lib/api";

interface TeacherClass {
  id: string; name: string; level: string; room: string; students: number;
  progress: number; schedule: string; nextLesson: string; attendance: string;
}

export default function TeacherClasses() {
  const navigate = useNavigate();
  const [assignedClasses, setAssignedClasses] = useState<TeacherClass[]>([]);

  useEffect(() => {
    apiGet<TeacherClass[]>('/api/teacher/classes')
      .then((r) => setAssignedClasses(r ?? []))
      .catch(() => setAssignedClasses([]));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white">Assigned Classes</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Viewing classes assigned to you for the current academic year.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignedClasses.map((cls) => (
          <Card key={cls.id} className="group overflow-hidden border-slate-200 dark:border-surface-raised hover:shadow-lg transition-all duration-300">
            <CardHeader className="bg-slate-50 dark:bg-surface-raised/50 border-b border-slate-100 dark:border-surface-raised p-5">
              <div className="flex justify-between items-start">
                <Badge variant="outline" className="bg-white dark:bg-surface-indigo text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border-slate-200 dark:border-surface-raised">
                  {cls.level}
                </Badge>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <MapPin className="h-3 w-3" />
                  <span className="text-[10px] font-bold uppercase">{cls.room}</span>
                </div>
              </div>
              <CardTitle className="mt-4 text-lg font-bold text-slate-900 dark:text-white group-hover:text-aubergine-600 transition-colors">
                {cls.name}
              </CardTitle>
              <CardDescription className="text-xs font-medium text-slate-500 line-clamp-1">
                {cls.schedule}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Students</p>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{cls.students} enrolled</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attendance</p>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{cls.attendance} avg</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <span>Course Progress</span>
                  <span className="text-slate-600 dark:text-slate-300">{cls.progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-surface-raised rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-aubergine-500 rounded-full transition-all duration-1000" 
                    style={{ width: `${cls.progress}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 font-bold text-[10px] uppercase tracking-widest h-9"
                  onClick={() => navigate(`/teacher/classes/${cls.id}`)}
                >
                  Class Details
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 border-slate-200 dark:border-surface-raised"
                  title="View timetable"
                  onClick={() => navigate('/teacher/timetable')}
                >
                  <Calendar className="h-4 w-4 text-slate-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
