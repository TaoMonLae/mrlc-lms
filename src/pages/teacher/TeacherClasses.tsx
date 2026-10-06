import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, BookOpen, Clock, CheckCircle2, GraduationCap, Calendar, ArrowRight, MoreHorizontal, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { apiGet } from "../../lib/api";

function sanitizeText(text: string): string {
  if (!text) return text;
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

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
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Assigned Classes</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Viewing classes assigned to you for the current academic year.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignedClasses.map((cls) => (
          <Card key={cls.id} className="group overflow-hidden border-border hover:shadow-none transition-all duration-300">
            <CardHeader className="bg-muted/50 border-b border-border p-5">
              <div className="flex justify-between items-start">
                <Badge variant="outline" className="bg-card text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 border-border">
                  {sanitizeText(cls.level)}
                </Badge>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="text-[11px] font-bold uppercase">{sanitizeText(cls.room)}</span>
                </div>
              </div>
              <CardTitle className="mt-4 text-lg font-bold text-foreground group-hover:text-aubergine-600 transition-colors">
                {sanitizeText(cls.name)}
              </CardTitle>
              <CardDescription className="text-xs font-medium text-muted-foreground line-clamp-1">
                {sanitizeText(cls.schedule)}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Students</p>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-bold text-foreground">{cls.students} enrolled</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Attendance</p>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-bold text-foreground">{cls.attendance} avg</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  <span>Course Progress</span>
                  <span className="text-muted-foreground">{cls.progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-aubergine-500 rounded-full transition-all duration-1000" 
                    style={{ width: `${cls.progress}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 font-bold text-[11px] uppercase tracking-widest h-9"
                  onClick={() => navigate(`/teacher/classes/${cls.id}`)}
                >
                  Class Details
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 border-border"
                  title="View timetable"
                  onClick={() => navigate('/teacher/timetable')}
                >
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
