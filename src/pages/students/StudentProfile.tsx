import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Edit, User, UserMinus, FileText, Trash2,
  MapPin, Phone, CreditCard, CheckCircle2,
  CalendarDays, Download, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StudentDocuments } from '@/src/components/students/StudentDocuments';
import { toast } from 'sonner';
import { HoloProfileHeader } from '@/src/components/profile/HoloProfileHeader';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { apiSend } from '../../lib/api';
import { getErrorMessage } from '../../lib/errors';
import { useAuth } from '../../providers/AuthProvider';
import { usePermissions } from '@/src/lib/permissions';

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { hasPermission } = usePermissions();
  // Case records (discipline/welfare notes) are sensitive -- only show the
  // tab at all to roles the permission model actually grants case access to.
  const canViewCases = isAdmin || hasPermission('view_cases');
  const [student, setStudent] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [attendanceData, setAttendanceData] = React.useState<any>(null);
  const [feesData, setFeesData] = React.useState<any>(null);
  const [examData, setExamData] = React.useState<any>(null);
  const [casesData, setCasesData] = React.useState<any[] | null>(null);

  React.useEffect(() => {
    const fetchStudentData = async () => {
      if (!id) return;
      try {
        const token = sessionStorage.getItem('auth_token');

        // Fetch basic student data
        const studentRes = await fetch(`/api/students/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (studentRes.ok) {
          const data = await studentRes.json();
          setStudent(data);
        }

        // Fetch attendance data for this student
        try {
          const attendanceRes = await fetch(`/api/reports/attendance?classId=all`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (attendanceRes.ok) {
            const attendanceReport = await attendanceRes.json();
            const studentAttendance = Array.isArray(attendanceReport?.rows)
              ? attendanceReport.rows.find((a: any) => a.studentId === id)
              : null;
            if (studentAttendance) {
              setAttendanceData({
                rate: studentAttendance.rate,
                total: studentAttendance.total,
                present: studentAttendance.present,
                absent: studentAttendance.absent,
                late: studentAttendance.late,
                excused: studentAttendance.excused,
              });
            }
          }
        } catch (err) {
          console.error('Error fetching attendance:', err);
        }

        // Fetch exam and fee data for this student profile
        try {
          const profileDataRes = await fetch(`/api/students/${id}/profile-data`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (profileDataRes.ok) {
            const profileData = await profileDataRes.json();
            setExamData(profileData.exams || null);
            setFeesData(profileData.fees || null);
          }
        } catch (err) {
          console.error('Error fetching profile tab data:', err);
        }

        // Fetch this student's case records, if this viewer is allowed to see them.
        if (canViewCases) {
          try {
            const casesRes = await fetch(`/api/cases?studentId=${id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (casesRes.ok) setCasesData(await casesRes.json());
          } catch (err) {
            console.error('Error fetching case records:', err);
          }
        }

      } catch (err) {
        console.error(err);
        toast.error('Failed to load student profile.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, canViewCases]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="animate-spin rounded-full h-6 w-6 border-2 border-aubergine-600 border-t-transparent mr-2"></span>
        <span className="text-slate-500">Loading student profile...</span>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>Student profile not found.</p>
        <Button variant="outline" className="mt-4" render={<Link to="/students" />} nativeButton={false}>
          Back to Students
        </Button>
      </div>
    );
  }

  // Map backend properties to UI variables
  const s = {
    id: student.id,
    studentId: student.studentCode,
    firstName: student.user?.firstName || '',
    lastName: student.user?.lastName || '',
    class: student.class?.name || 'Unassigned',
    status: student.status || 'ACTIVE',
    gender: student.gender || 'MALE',
    enrollmentDate: student.enrollmentDate || new Date().toISOString(),
    dateOfBirth: student.dateOfBirth || new Date().toISOString(),
    country: student.country || 'Unspecified',
    identityType: student.identityType || '',
    identityNumber: student.identityNumber || 'Unspecified',
    contactNumber: student.contactNumber || 'Unspecified',
    address: student.address || 'Unspecified',
    guardianName: student.guardianName || 'Unspecified',
    guardianPhone: student.guardianPhone || 'Unspecified',
    emergencyContact: student.emergencyContact || 'Unspecified',
    notes: student.notes || 'No notes available.',
    profilePhotoUrl: student.profilePhotoUrl || student.user?.profilePhotoUrl || null,
  };

  // "Left the school" — soft-remove (reversible). See StudentsList.tsx for
  // the same pair of actions on the list page.
  const markDropped = async () => {
    const name = `${s.firstName} ${s.lastName}`.trim();
    if (!confirm(`Mark ${name} as Dropped (left the school)? They'll disappear from active class rosters and attendance marking, but all their grades, attendance, and exam history is kept. You can reverse this later from Edit Details.`)) return;
    try {
      await apiSend(`/api/students/${s.id}`, 'PUT', { status: 'DROPPED' });
      toast.success(`${name} marked as Dropped.`);
      setStudent((prev: any) => prev ? { ...prev, status: 'DROPPED' } : prev);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // Permanent hard delete — irreversible, cascades to erase attendance,
  // grades, exam attempts, fee payments, and case records.
  const permanentlyDelete = async () => {
    const name = `${s.firstName} ${s.lastName}`.trim();
    const typed = window.prompt(
      `This PERMANENTLY deletes ${name} (${s.studentId}) and ALL their records — attendance, grades, exam history, fee payments, case notes. This cannot be undone.\n\nIf you just want to remove them from active rosters, cancel this and use "Mark as Left (Dropped)" instead — it keeps their history.\n\nType the student ID "${s.studentId}" to confirm permanent deletion:`
    );
    if (typed === null) return;
    if (typed !== s.studentId) {
      toast.error('Student ID did not match — nothing was deleted.');
      return;
    }
    try {
      await apiSend(`/api/students/${s.id}`, 'DELETE');
      toast.success(`${name} permanently deleted.`);
      navigate('/students');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const formatCurrency = (amount: number, currency = 'MYR') =>
    new Intl.NumberFormat('en-MY', { style: 'currency', currency }).format(Number(amount || 0));
  const latestGrade = examData?.results?.[0]?.grade || null;
  const examAverage = examData?.average;
  const feeCurrency = feesData?.currency || 'MYR';

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header & Actions — name/status/id now live on the holographic
          profile card below instead of duplicating them here as text. */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <Button variant="ghost" size="sm" className="-ml-3 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/students" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Students
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" render={<Link to={`/students/${id}/edit`} />} nativeButton={false}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
          <Button variant="secondary" className="text-aubergine-600 bg-aubergine-50 hover:bg-aubergine-100 dark:bg-aubergine-900/20 dark:hover:bg-aubergine-900/40" render={<Link to="/reports/students" />} nativeButton={false}>
            <FileText className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <UserMinus className="mr-2 h-4 w-4" />
                    Remove Student
                  </Button>
                }
                nativeButton={true}
              />
              <DropdownMenuContent align="end">
                {s.status !== 'DROPPED' && (
                  <DropdownMenuItem className="text-amber-600" onClick={markDropped}>
                    <UserMinus className="mr-2 h-4 w-4" />
                    Mark as Left (Dropped)
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-red-600" onClick={permanentlyDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Permanently
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Holographic profile header — replaces the old photo+name block that
          used to sit at the top of the left sidebar. Kept full-width here
          since the card's intrinsic size (up to ~390x540) doesn't fit
          inside the sidebar's fixed 300px column. */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
        <HoloProfileHeader
          name={`${s.firstName} ${s.lastName}`}
          title={s.class}
          handle={s.studentId}
          status={s.status}
          photoUrl={s.profilePhotoUrl}
          onPhotoUploaded={(url) => setStudent((prev: any) => prev ? { ...prev, profilePhotoUrl: url } : prev)}
          targetType="student"
          targetId={s.id}
          contactText="Edit Profile"
          onContactClick={() => navigate(`/students/${id}/edit`)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">

        {/* Left Sidebar Info Card */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-surface-indigo rounded-xl border border-slate-200 dark:border-surface-raised p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Quick Facts</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Enrolled</span>
                <span className="font-medium text-slate-900 dark:text-slate-300">{new Date(s.enrollmentDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Gender</span>
                <span className="font-medium capitalize text-slate-900 dark:text-slate-300">{s.gender.toLowerCase()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">DOB</span>
                <span className="font-medium text-slate-900 dark:text-slate-300">{new Date(s.dateOfBirth).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Country</span>
                <span className="font-medium text-slate-900 dark:text-slate-300">{s.country}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">{s.identityType ? s.identityType.replace('_', ' ') : 'ID Number'}</span>
                <span className="font-medium text-slate-900 dark:text-slate-300">{s.identityNumber}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-indigo rounded-xl border border-slate-200 dark:border-surface-raised p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Contact Information</h3>
            <div className="space-y-4 text-sm">
              <div className="flex gap-3">
                <User className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-300">{s.guardianName}</p>
                  <p className="text-slate-500 text-xs">Parent/Guardian</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Phone className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-700 dark:text-slate-300">{s.contactNumber}</p>
                  <p className="text-slate-500 text-xs">Student Contact</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Phone className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-700 dark:text-slate-300">{s.guardianPhone}</p>
                  <p className="text-slate-500 text-xs">Guardian Phone</p>
                </div>
              </div>
              <div className="flex gap-3">
                <AlertTriangle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-700 dark:text-slate-300">{s.emergencyContact}</p>
                  <p className="text-slate-500 text-xs">Emergency</p>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <span className="text-slate-700 dark:text-slate-300">{s.address}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Main Content Tabs */}
        <div className="bg-white dark:bg-surface-indigo rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm overflow-hidden">
          <Tabs defaultValue="overview" className="w-full">
            <div className="border-b border-slate-200 dark:border-surface-raised px-2 overflow-x-auto">
              <TabsList className="h-14 w-full justify-start bg-transparent">
                <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-aubergine-600 rounded-none h-14 px-6 font-semibold">Overview</TabsTrigger>
                <TabsTrigger value="attendance" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-aubergine-600 rounded-none h-14 px-6 font-semibold">Attendance</TabsTrigger>
                <TabsTrigger value="exams" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-aubergine-600 rounded-none h-14 px-6 font-semibold">Exams</TabsTrigger>
                <TabsTrigger value="fees" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-aubergine-600 rounded-none h-14 px-6 font-semibold">Fees</TabsTrigger>
                <TabsTrigger value="documents" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-aubergine-600 rounded-none h-14 px-6 font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documents
                </TabsTrigger>
                {canViewCases && (
                  <TabsTrigger value="cases" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-aubergine-600 rounded-none h-14 px-6 font-semibold">Cases</TabsTrigger>
                )}
              </TabsList>
            </div>
            
            {/* Overview Tab Content */}
            <TabsContent value="overview" className="p-6 m-0 border-none space-y-8 focus-visible:outline-none focus-visible:ring-0">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">Remarks & Notes</h3>
                <div className="bg-slate-50 dark:bg-surface-raised/50 p-4 rounded-lg text-sm text-slate-700 dark:text-slate-300 leading-relaxed border border-slate-100 dark:border-surface-raised">
                  {s.notes}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 border border-slate-200 dark:border-surface-raised rounded-lg flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">
                      {attendanceData ? `${attendanceData.rate}%` : 'N/A'}
                    </p>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance Rate</p>
                    {attendanceData && (
                      <p className="text-[10px] text-slate-400 mt-1">{attendanceData.present} of {attendanceData.total} days</p>
                    )}
                  </div>
                </div>

                <div className="p-4 border border-slate-200 dark:border-surface-raised rounded-lg flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">
                      {latestGrade || (examAverage != null ? `${examAverage}%` : 'N/A')}
                    </p>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Grade</p>
                    {examAverage != null && (
                      <p className="text-[10px] text-slate-400 mt-1">{examAverage}% average</p>
                    )}
                  </div>
                </div>

                <div className="p-4 border border-slate-200 dark:border-surface-raised rounded-lg flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-aubergine-100 flex items-center justify-center text-aubergine-600 shrink-0">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">
                      {feesData ? formatCurrency(feesData.totalPaid, feeCurrency) : 'N/A'}
                    </p>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Paid</p>
                    {feesData && (
                      <p className="text-[10px] text-slate-400 mt-1">{feesData.paymentCount} payment(s)</p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="attendance" className="p-6 m-0 border-none min-h-[300px] focus-visible:outline-none focus-visible:ring-0">
              {attendanceData ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                      { label: 'Attendance Rate', value: `${attendanceData.rate}%` },
                      { label: 'Total Records', value: attendanceData.total },
                      { label: 'Present', value: attendanceData.present },
                      { label: 'Late', value: attendanceData.late },
                      { label: 'Absent', value: attendanceData.absent },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg border border-slate-200 dark:border-surface-raised p-4">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{item.value}</p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{item.label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-slate-500">Attendance summary is calculated from saved attendance records.</p>
                </div>
              ) : (
                <div className="min-h-[240px] flex items-center justify-center text-center text-slate-500">
                  <div>
                    <CalendarDays className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                    <p>No attendance records found for this student.</p>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="exams" className="p-6 m-0 border-none min-h-[300px] focus-visible:outline-none focus-visible:ring-0">
              {examData && (examData.results?.length > 0 || examData.available?.length > 0) ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-lg border border-slate-200 dark:border-surface-raised p-4">
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{examData.average ?? 'N/A'}{examData.average != null ? '%' : ''}</p>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Average</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 dark:border-surface-raised p-4">
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{examData.results?.length || 0}</p>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Graded Exams</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 dark:border-surface-raised p-4">
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{examData.available?.length || 0}</p>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Exams</p>
                    </div>
                  </div>

                  {examData.results?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white mb-3">Exam Results</h3>
                      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-surface-raised">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 dark:bg-surface-raised/50 text-xs uppercase tracking-wider text-slate-500">
                            <tr>
                              <th className="px-4 py-3">Exam</th>
                              <th className="px-4 py-3">Subject</th>
                              <th className="px-4 py-3">Score</th>
                              <th className="px-4 py-3">Grade</th>
                              <th className="px-4 py-3">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {examData.results.map((result: any) => (
                              <tr key={result.id}>
                                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{result.title}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{result.subject}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{result.score}/{result.total} ({result.percentage}%)</td>
                                <td className="px-4 py-3"><Badge variant="outline">{result.grade}</Badge></td>
                                <td className="px-4 py-3 text-slate-500">{result.date}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {examData.available?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white mb-3">Pending Exams</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {examData.available.map((exam: any) => (
                          <div key={exam.id} className="rounded-lg border border-slate-200 dark:border-surface-raised p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-white">{exam.title}</p>
                                <p className="text-sm text-slate-500">{exam.subject} • {exam.type}</p>
                              </div>
                              <Badge variant="secondary">{exam.date}</Badge>
                            </div>
                            <p className="text-xs text-slate-500 mt-3">{exam.questions} questions • {exam.totalMarks || 'N/A'} marks • {exam.durationMinutes ? `${exam.durationMinutes} min` : 'No time limit'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="min-h-[240px] flex items-center justify-center text-center text-slate-500">
                  <div>
                    <FileText className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                    <p>No exam results or pending exams found for this student.</p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="fees" className="p-6 m-0 border-none min-h-[300px] focus-visible:outline-none focus-visible:ring-0">
              {feesData && feesData.rows?.length > 0 ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-lg border border-slate-200 dark:border-surface-raised p-4">
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(feesData.totalExpected, feeCurrency)}</p>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Fees</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 dark:border-surface-raised p-4">
                      <p className="text-2xl font-bold text-emerald-600">{formatCurrency(feesData.totalPaid, feeCurrency)}</p>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Paid</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 dark:border-surface-raised p-4">
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(feesData.balance, feeCurrency)}</p>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Balance</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-surface-raised">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-surface-raised/50 text-xs uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Receipt</th>
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {feesData.rows.map((fee: any) => (
                          <tr key={fee.id}>
                            <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">{fee.receiptNumber || '—'}</td>
                            <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{fee.description || fee.paymentType || 'Fee Payment'}</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatCurrency(fee.amount, fee.currency || feeCurrency)}</td>
                            <td className="px-4 py-3">
                              <Badge variant={fee.status === 'PAID' ? 'default' : 'secondary'} className={fee.status === 'PAID' ? 'bg-emerald-500' : ''}>{fee.status}</Badge>
                            </td>
                            <td className="px-4 py-3 text-slate-500">{fee.paymentDate ? new Date(fee.paymentDate).toLocaleDateString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="min-h-[240px] flex items-center justify-center text-center text-slate-500">
                  <div>
                    <CreditCard className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                    <p>No fee payment records found for this student.</p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="p-6 m-0 border-none focus-visible:outline-none focus-visible:ring-0">
              <StudentDocuments studentId={id || ''} />
            </TabsContent>

            {canViewCases && (
              <TabsContent value="cases" className="p-6 m-0 border-none min-h-[300px] focus-visible:outline-none focus-visible:ring-0">
                {casesData === null ? (
                  <div className="flex items-center justify-center min-h-[240px] text-slate-400">
                    <span className="animate-spin rounded-full h-5 w-5 border-2 border-aubergine-600 border-t-transparent mr-2"></span>
                    Loading case records…
                  </div>
                ) : casesData.length === 0 ? (
                  <div className="flex items-center justify-center min-h-[240px]">
                    <div className="text-center text-slate-500">
                      <AlertTriangle className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                      <p>No case records for this student.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {casesData.map((c: any) => (
                      <Link
                        key={c.id}
                        to={`/cases/${c.id}`}
                        className="block rounded-lg border border-slate-200 dark:border-surface-raised p-4 hover:border-aubergine-300 hover:bg-slate-50 dark:hover:bg-surface-raised/50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{c.title}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className={
                              c.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-0' :
                              c.status === 'FOLLOW_UP' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-0' :
                              c.status === 'CLOSED' ? 'bg-slate-100 text-slate-500 dark:bg-surface-raised dark:text-slate-400 border-0' :
                              'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-0'
                            }>{(c.status || 'OPEN').replace('_', ' ')}</Badge>
                            <Badge variant={c.priority === 'URGENT' ? 'destructive' : 'outline'} className="uppercase text-[10px]">{c.priority}</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{c.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                          {c.category && <span>{c.category}</span>}
                          <span>Opened {new Date(c.createdAt).toLocaleDateString()}</span>
                          {c.notes?.length > 0 && <span>{c.notes.length} note{c.notes.length === 1 ? '' : 's'}</span>}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
