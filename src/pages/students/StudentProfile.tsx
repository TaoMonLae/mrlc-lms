import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Edit, User, UserMinus, FileText, 
  MapPin, Phone, CreditCard, CheckCircle2,
  CalendarDays, Download, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StudentDocuments } from '@/src/components/students/StudentDocuments';
import { toast } from 'sonner';
import { ProfilePhotoUploader } from '@/src/components/profile/ProfilePhotoUploader';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [attendanceData, setAttendanceData] = React.useState<any>(null);
  const [feesData, setFeesData] = React.useState<any>(null);

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
            const attendanceRecords = await attendanceRes.json();
            // Filter attendance for this student and calculate rate
            const studentAttendance = attendanceRecords.filter((a: any) => a.studentId === id);
            if (studentAttendance.length > 0) {
              const presentCount = studentAttendance.filter((a: any) => a.status === 'PRESENT').length;
              const attendanceRate = Math.round((presentCount / studentAttendance.length) * 100);
              setAttendanceData({ rate: attendanceRate, total: studentAttendance.length, present: presentCount });
            }
          }
        } catch (err) {
          console.error('Error fetching attendance:', err);
        }

        // Fetch fees data for this student
        try {
          const feesRes = await fetch(`/api/fees`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (feesRes.ok) {
            const fees = await feesRes.json();
            const studentFees = fees.filter((f: any) => f.studentId === id);
            if (studentFees.length > 0) {
              const totalPaid = studentFees.reduce((sum: number, f: any) => sum + (f.amount || 0), 0);
              setFeesData({ totalPaid, paymentCount: studentFees.length });
            }
          }
        } catch (err) {
          console.error('Error fetching fees:', err);
        }

      } catch (err) {
        console.error(err);
        toast.error('Failed to load student profile.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudentData();
  }, [id]);

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

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/students" />} nativeButton={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Students
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{s.firstName} {s.lastName}</h1>
            <Badge className="bg-emerald-500">{s.status}</Badge>
          </div>
          <p className="text-sm font-mono text-slate-500 mt-1 dark:text-slate-300">{s.studentId} • Enrolled {new Date(s.enrollmentDate).toLocaleDateString()}</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" render={<Link to={`/students/${id}/edit`} />} nativeButton={false}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
          <Button variant="secondary" className="text-aubergine-600 bg-aubergine-50 hover:bg-aubergine-100 dark:bg-aubergine-900/20 dark:hover:bg-aubergine-900/40" render={<Link to="/reports/students" />} nativeButton={false}>
            <FileText className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
        
        {/* Left Sidebar Info Card */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-surface-indigo rounded-xl border border-slate-200 dark:border-surface-raised p-6 shadow-sm flex flex-col items-center">
            <ProfilePhotoUploader
              currentUrl={s.profilePhotoUrl}
              fallbackText={`${s.firstName.charAt(0)}${s.lastName.charAt(0)}`}
              targetType="student"
              targetId={s.id}
              imageClassName="h-24 w-24 rounded-full"
              buttonLabel="Change Picture"
              onUploaded={(url) => setStudent((prev: any) => prev ? { ...prev, profilePhotoUrl: url } : prev)}
            />
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">{s.firstName} {s.lastName}</h2>
            <p className="font-semibold text-slate-500 text-sm">{s.class}</p>
            
            <div className="w-full mt-6 space-y-4 pt-6 border-t border-slate-100 dark:border-surface-raised">
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
                <TabsTrigger value="cases" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-aubergine-600 rounded-none h-14 px-6 font-semibold">Cases</TabsTrigger>
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
                    <p className="text-xl font-bold text-slate-900 dark:text-white">N/A</p>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Grade</p>
                    <p className="text-[10px] text-slate-400 mt-1">Grades coming soon</p>
                  </div>
                </div>

                <div className="p-4 border border-slate-200 dark:border-surface-raised rounded-lg flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-aubergine-100 flex items-center justify-center text-aubergine-600 shrink-0">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">
                      {feesData ? `$${feesData.totalPaid}` : 'N/A'}
                    </p>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Paid</p>
                    {feesData && (
                      <p className="text-[10px] text-slate-400 mt-1">{feesData.paymentCount} payment(s)</p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="attendance" className="p-6 m-0 border-none min-h-[300px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-0">
               <div className="text-center text-slate-500">
                  <CalendarDays className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                  <p>Attendance records will be displayed here.</p>
               </div>
            </TabsContent>
            
            <TabsContent value="exams" className="p-6 m-0 border-none min-h-[300px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-0">
               <div className="text-center text-slate-500">
                  <FileText className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                  <p>Exam results will be displayed here.</p>
               </div>
            </TabsContent>

            <TabsContent value="fees" className="p-6 m-0 border-none min-h-[300px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-0">
               <div className="text-center text-slate-500">
                  <CreditCard className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                  <p>Fee payment history will be displayed here.</p>
               </div>
            </TabsContent>

            <TabsContent value="documents" className="p-6 m-0 border-none focus-visible:outline-none focus-visible:ring-0">
              <StudentDocuments studentId={id || ''} />
            </TabsContent>

            <TabsContent value="cases" className="p-6 m-0 border-none min-h-[300px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-0">
               <div className="text-center text-slate-500">
                  <AlertTriangle className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                  <p>Case records will be displayed here.</p>
               </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
