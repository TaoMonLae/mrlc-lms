import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  Users,
  Plus,
  ChevronLeft,
  CheckCircle2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiGet, apiSend } from "../../lib/api";
import { toast } from "sonner";

interface LessonPlan {
  id: string;
  title: string;
  description: string;
  class: { id: string; name: string; level: string };
  subject?: { id: string; name: string; code: string };
  plannedDate: string;
  duration: number;
  room: string;
  objectives: string[];
  materials: string[];
  activities: string[];
  assessment?: string;
  status: string;
}

interface ClassOption {
  id: string;
  name: string;
  level: string;
}

export default function LessonPlanner() {
  const navigate = useNavigate();
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    classId: '',
    subjectId: '',
    plannedDate: '',
    duration: 60,
    room: '',
    objectives: '',
    materials: '',
    activities: '',
    assessment: ''
  });

  useEffect(() => {
    // Fetch classes
    apiGet<any[]>('/api/teacher/classes')
      .then((data) => {
        if (data) {
          setClasses(data.map((c: any) => ({
            id: c.classInfo.id,
            name: c.classInfo.name,
            level: c.classInfo.level
          })));
        }
      })
      .catch(() => {});

    // Fetch lesson plans
    apiGet<LessonPlan[]>('/api/lesson-plans?upcoming=true')
      .then((data) => {
        if (data) {
          setLessonPlans(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.classId || !formData.plannedDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const lessonData = {
        title: formData.title,
        description: formData.description,
        classId: formData.classId,
        subjectId: formData.subjectId || null,
        plannedDate: formData.plannedDate,
        duration: formData.duration,
        room: formData.room,
        objectives: formData.objectives.split('\n').filter(o => o.trim()),
        materials: formData.materials.split('\n').filter(m => m.trim()),
        activities: formData.activities.split('\n').filter(a => a.trim()),
        assessment: formData.assessment || null
      };

      const response = await apiSend('/api/lesson-plans', 'POST', lessonData);

      if (response) {
        toast.success('Lesson plan created successfully!');
        setShowForm(false);
        setFormData({
          title: '',
          description: '',
          classId: '',
          subjectId: '',
          plannedDate: '',
          duration: 60,
          room: '',
          objectives: '',
          materials: '',
          activities: '',
          assessment: ''
        });

        // Refresh the lesson plans
        apiGet<LessonPlan[]>('/api/lesson-plans?upcoming=true')
          .then((data) => {
            if (data) setLessonPlans(data);
          });
      }
    } catch (error) {
      toast.error('Failed to create lesson plan');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-slate-500"
            onClick={() => navigate('/teacher/dashboard')}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white">Lesson Planner</h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">Plan and manage your lesson schedules</p>
          </div>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold text-[11px] uppercase tracking-wider h-10 px-4"
        >
          {showForm ? 'Cancel' : <><Plus className="h-4 w-4 mr-2" /> New Lesson Plan</>}
        </Button>
      </div>

      {showForm && (
        <Card className="border-slate-200 dark:border-surface-raised">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Create New Lesson Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Title *</label>
                  <Input
                    placeholder="Lesson title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Class *</label>
                  <Select value={formData.classId} onValueChange={(value) => setFormData({ ...formData, classId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} ({cls.level})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Date *</label>
                  <Input
                    type="date"
                    value={formData.plannedDate}
                    onChange={(e) => setFormData({ ...formData, plannedDate: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Duration (minutes)</label>
                  <Input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
                    min="15"
                    step="15"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Room</label>
                  <Input
                    placeholder="Room number or location"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Subject</label>
                  <Input
                    placeholder="Subject (optional)"
                    value={formData.subjectId}
                    onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Description</label>
                <Textarea
                  placeholder="Brief description of the lesson..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Learning Objectives (one per line)</label>
                <Textarea
                  placeholder="• Students will be able to...&#10;• Understand the concept of...&#10;• Apply knowledge to..."
                  value={formData.objectives}
                  onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Materials Needed (one per line)</label>
                <Textarea
                  placeholder="• Textbook page 45-47&#10;• Whiteboard and markers&#10;• Student worksheets..."
                  value={formData.materials}
                  onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Activities (one per line)</label>
                <Textarea
                  placeholder="• Introduction (5 min): Review previous lesson&#10;• Main activity (30 min): Group work&#10;• Practice (15 min): Individual exercises..."
                  value={formData.activities}
                  onChange={(e) => setFormData({ ...formData, activities: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Assessment Method</label>
                <Textarea
                  placeholder="How will you assess student understanding?"
                  value={formData.assessment}
                  onChange={(e) => setFormData({ ...formData, assessment: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-aubergine-600 hover:bg-aubergine-700 text-white"
                >
                  Create Lesson Plan
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Upcoming Lessons</h2>

        {lessonPlans.length === 0 ? (
          <Card className="border-slate-200 dark:border-surface-raised">
            <CardContent className="p-8 text-center text-slate-400">
              No upcoming lesson plans. Create your first lesson plan to get started!
            </CardContent>
          </Card>
        ) : (
          lessonPlans.map((plan) => (
            <Card key={plan.id} className="border-slate-200 dark:border-surface-raised hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{plan.title}</h3>
                      <Badge variant={plan.status === 'SCHEDULED' ? 'default' : 'secondary'} className="font-bold text-[10px] uppercase">
                        {plan.status}
                      </Badge>
                    </div>

                    <p className="text-slate-600 dark:text-slate-300 text-sm mb-4">{plan.description}</p>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="h-4 w-4" />
                        <span>{plan.class.name} ({plan.class.level})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(plan.plannedDate)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>{plan.duration} minutes</span>
                      </div>
                      {plan.room && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" />
                          <span>{plan.room}</span>
                        </div>
                      )}
                    </div>

                    {plan.objectives && plan.objectives.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Objectives:</h4>
                        <ul className="space-y-1">
                          {plan.objectives.slice(0, 3).map((objective, index) => (
                            <li key={index} className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                              <span>{objective}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-4"
                    onClick={() => navigate(`/teacher/planner/${plan.id}`)}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}