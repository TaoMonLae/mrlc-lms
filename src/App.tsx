import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import LoginPage from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import DashboardPage from "./pages/Dashboard";
import { PlaceholderPage } from "./pages/Placeholder";
import StudentsList from "./pages/students/StudentsList";
import StudentNew from "./pages/students/StudentNew";
import StudentProfile from "./pages/students/StudentProfile";
import StudentEdit from "./pages/students/StudentEdit";
import AttendanceReportsPage from "./pages/attendance/AttendanceReports";

import ExamNew from "./pages/exams/ExamNew";
import ExamProfile from "./pages/exams/ExamProfile";
import ExamEdit from "./pages/exams/ExamEdit";
import ExamTake from "./pages/exams/ExamTake";
import ExamResults from "./pages/exams/ExamResults";
import ExamsList from "./pages/exams/ExamsList";
import ExamPreview from "./pages/exams/ExamPreview";

const ExamPlayer = lazy(() => import("./pages/exam2/ExamPlayer"));
const ResumeAttempt = lazy(() => import("./pages/exam2/ResumeAttempt"));
const ExamResultView = lazy(() => import("./pages/exam2/ExamResultView"));
const ExamScheduling = lazy(() => import("./pages/exam2/ExamScheduling"));
const ManualGradingQueue = lazy(() => import("./pages/exam2/ManualGradingQueue"));
const RubricGrading = lazy(() => import("./pages/exam2/RubricGrading"));
const ExamAnalytics = lazy(() => import("./pages/exam2/ExamAnalytics"));
const QuestionAnalytics = lazy(() => import("./pages/exam2/QuestionAnalytics"));
const InvigilatorDashboard = lazy(() => import("./pages/exam2/InvigilatorDashboard"));
const AccommodationManagement = lazy(() => import("./pages/exam2/AccommodationManagement"));
const PrintableExport = lazy(() => import("./pages/exam2/PrintableExport"));
const ExamAuthoring = lazy(() => import("./pages/exam2/ExamAuthoring"));
const QuestionBank = lazy(() => import("./pages/bank/QuestionBank"));
const QuestionEditor = lazy(() => import("./pages/bank/QuestionEditor"));
const TopicManager = lazy(() => import("./pages/bank/TopicManager"));

import TeachersList from "./pages/teachers/TeachersList";
import TeacherNew from "./pages/teachers/TeacherNew";
import TeacherProfile from "./pages/teachers/TeacherProfile";
import TeacherEdit from "./pages/teachers/TeacherEdit";

import ClassesList from "./pages/classes/ClassesList";
import ClassNew from "./pages/classes/ClassNew";
import ClassProfile from "./pages/classes/ClassProfile";
import ClassEdit from "./pages/classes/ClassEdit";

import SubjectsList from "./pages/subjects/SubjectsList";
import SubjectNew from "./pages/subjects/SubjectNew";
import SubjectProfile from "./pages/subjects/SubjectProfile";
import SubjectEdit from "./pages/subjects/SubjectEdit";

import UsersList from "./pages/users/UsersList";
import UserNew from "./pages/users/UserNew";
import UserEdit from "./pages/users/UserEdit";

import LibraryList from "./pages/library/LibraryList";
import LibraryNew from "./pages/library/LibraryNew";
import LibraryDetail from "./pages/library/LibraryDetail";
import LibraryEdit from "./pages/library/LibraryEdit";

import EbookList from "./pages/elibrary/EbookList";
const EbookReader = lazy(() => import("./pages/elibrary/EbookReader"));
import EbookUpload from "./pages/elibrary/EbookUpload";
import EbookEdit from "./pages/elibrary/EbookEdit";

import FeesDashboard from "./pages/fees/FeesDashboard";
import PaymentNew from "./pages/fees/PaymentNew";
import StudentFeeProfile from "./pages/fees/StudentFeeProfile";
import PaymentReceipt from "./pages/fees/PaymentReceipt";

import CasesDashboard from "./pages/cases/CasesDashboard";
import CaseNew from "./pages/cases/CaseNew";
import CaseDetail from "./pages/cases/CaseDetail";
import CaseEdit from "./pages/cases/CaseEdit";

import ReportsDashboard from "./pages/reports/ReportsDashboard";
import AttendanceReport from "./pages/reports/AttendanceReport";
import FeesReport from "./pages/reports/FeesReport";
import StudentProfileReport from "./pages/reports/StudentProfileReport";
import ExamResultsReport from "./pages/reports/ExamResultsReport";
import ClassPerformanceReport from "./pages/reports/ClassPerformanceReport";
import MonthlySummaryReport from "./pages/reports/MonthlySummaryReport";
import SchoolOperations from "./pages/operations/SchoolOperations";
import StaffDirectory from "./pages/hr/StaffDirectory";
import StaffProfile from "./pages/hr/StaffProfile";
import Departments from "./pages/hr/Departments";
import Payroll from "./pages/hr/Payroll";
import Leave from "./pages/hr/Leave";
import PayslipPrint from "./pages/hr/PayslipPrint";
import PayrollRunPrint from "./pages/hr/PayrollRunPrint";
import ChatPage from "./pages/chat/ChatPage";
import SocialSpace from "./pages/social/SocialSpace";
import ChatModeration from "./pages/chat/ChatModeration";
import ChatStickers from "./pages/chat/ChatStickers";
import AdmissionsList from "./pages/admissions/AdmissionsList";
import AdmissionDetail from "./pages/admissions/AdmissionDetail";

import RolesPermissions from "./pages/settings/RolesPermissions";
import SettingsLayout from "./pages/settings/SettingsLayout";
import SchoolSettings from "./pages/settings/SchoolSettings";
import BrandingSettings from "./pages/settings/BrandingSettings";
import SystemSettings from "./pages/settings/SystemSettings";
import BackupAndRestore from "./pages/settings/BackupAndRestore";
import AuditLogPage from "./pages/settings/AuditLog";
import ExportDataPage from "./pages/settings/ExportData";

import AnnouncementsList from "./pages/announcements/AnnouncementsList";
import AnnouncementNew from "./pages/announcements/AnnouncementNew";
import AnnouncementDetail from "./pages/announcements/AnnouncementDetail";
import AnnouncementEdit from "./pages/announcements/AnnouncementEdit";

import GradebookPage from "./pages/gradebook/Gradebook";
import GedReadinessPage from "./pages/gradebook/GedReadiness";
import StudentProgress from "./pages/gradebook/StudentProgress";
import GradebookClassReport from "./pages/gradebook/GradebookClassReport";

import DocumentsPage from "./pages/documents/Documents";
import DocumentPrint from "./pages/documents/DocumentPrint";
import VerifyDocument from "./pages/documents/VerifyDocument";
import StudentDocumentsPage from "./pages/student/StudentDocuments";

import TimetablePage from "./pages/timetable/TimetablePage";
import TimetableNew from "./pages/timetable/TimetableNew";
import TimetableEdit from "./pages/timetable/TimetableEdit";

import StudentDashboard from "./pages/student/StudentDashboard";
import StudentProfilePage from "./pages/student/StudentProfilePage";
import StudentAttendance from "./pages/student/StudentAttendance";
import StudentExams from "./pages/student/StudentExams";
import StudentResults from "./pages/student/StudentResults";
import StudentLibrary from "./pages/student/StudentLibrary";
import StudentFees from "./pages/student/StudentFees";
import StudentVideos from "./pages/student/StudentVideos";

import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherClasses from "./pages/teacher/TeacherClasses";
import ClassDetails from "./pages/teacher/ClassDetails";
import TeacherAttendance from "./pages/teacher/TeacherAttendance";
import TeacherExams from "./pages/teacher/TeacherExams";
import TeacherLibrary from "./pages/teacher/TeacherLibrary";
import TeacherReports from "./pages/teacher/TeacherReports";
import TeacherTimetable from "./pages/teacher/TeacherTimetable";
import TeacherVideos from "./pages/teacher/TeacherVideos";
import LessonPlanner from "./pages/teacher/LessonPlanner";

import VideoList from "./pages/videos/VideoList";
import VideoNew from "./pages/videos/VideoNew";
import VideoDetail from "./pages/videos/VideoDetail";
import VideoEdit from "./pages/videos/VideoEdit";

import BooksList from "./pages/books/BooksList";
import BookNew from "./pages/books/BookNew";
import BookDetail from "./pages/books/BookDetail";
import BookEdit from "./pages/books/BookEdit";

import UnauthorizedPage from "./pages/Unauthorized";

import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { SettingsProvider } from "./providers/SettingsProvider";
import { AuthProvider } from "./providers/AuthProvider";
import { I18nProvider } from "./i18n/I18nProvider";

import LandingPage from "./pages/Landing";

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="mrlc-lms-theme">
      <I18nProvider>
      <AuthProvider>
        <SettingsProvider>
        <TooltipProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/verify/:token" element={<VerifyDocument />} />
            
            <Route element={<ProtectedRoute />}>
              <Route path="/change-password" element={<ChangePassword />} />
              <Route path="/documents/:id/print" element={<DocumentPrint />} />
              <Route path="/payroll/payslips/:id/print" element={<PayslipPrint />} />
              <Route path="/payroll/runs/:id/print" element={<PayrollRunPrint />} />
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />

                <Route element={<ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']} />}>
                  <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
                  <Route path="/teacher/classes" element={<TeacherClasses />} />
                  <Route path="/teacher/classes/:id" element={<ClassDetails />} />
                  <Route path="/teacher/attendance" element={<TeacherAttendance />} />
                  <Route path="/teacher/exams" element={<TeacherExams />} />
                  <Route path="/teacher/library" element={<TeacherLibrary />} />
                  <Route path="/teacher/reports" element={<TeacherReports />} />
                  <Route path="/teacher/timetable" element={<TeacherTimetable />} />
                  <Route path="/teacher/videos" element={<TeacherVideos />} />
                  <Route path="/teacher/planner" element={<LessonPlanner />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']} />}>
                  <Route path="/student/dashboard" element={<StudentDashboard />} />
                  <Route path="/student/profile" element={<StudentProfilePage />} />
                  <Route path="/student/attendance" element={<StudentAttendance />} />
                  <Route path="/student/exams" element={<StudentExams />} />
                  <Route path="/student/results" element={<StudentResults />} />
                  <Route path="/student/grades" element={<StudentProgress />} />
                  <Route path="/student/documents" element={<StudentDocumentsPage />} />
                  <Route path="/student/library" element={<StudentLibrary />} />
                  <Route path="/student/fees" element={<StudentFees />} />
                  <Route path="/student/videos" element={<StudentVideos />} />
                  <Route path="/exam2/resume" element={<ResumeAttempt />} />
                  <Route path="/exam2/attempts/:attemptId/play" element={<ExamPlayer />} />
                  <Route path="/exam2/attempts/:attemptId/result" element={<ExamResultView />} />
                </Route>
                
                <Route path="/announcements" element={<AnnouncementsList />} />
                <Route path="/announcements/:id" element={<AnnouncementDetail />} />

                {/* Chat — available to every authenticated role */}
                <Route path="/chat" element={<ChatPage />} />

                {/* Social Space — ephemeral 24h community feed */}
                <Route path="/social" element={<SocialSpace />} />

                <Route path="/timetable" element={<TimetablePage />} />

                <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']} />}>
                  <Route path="/announcements/new" element={<AnnouncementNew />} />
                  <Route path="/announcements/:id/edit" element={<AnnouncementEdit />} />
                  <Route path="/timetable/new" element={<TimetableNew />} />
                  <Route path="/timetable/:id/edit" element={<TimetableEdit />} />
                  <Route path="/students" element={<StudentsList />} />
                  <Route path="/students/new" element={<StudentNew />} />
                  <Route path="/students/:id" element={<StudentProfile />} />
                  <Route path="/students/:id/edit" element={<StudentEdit />} />
                  
                  <Route path="/classes" element={<ClassesList />} />
                  <Route path="/classes/new" element={<ClassNew />} />
                  <Route path="/classes/:id" element={<ClassProfile />} />
                  <Route path="/classes/:id/edit" element={<ClassEdit />} />
                  
                  <Route path="/subjects" element={<SubjectsList />} />
                  <Route path="/subjects/new" element={<SubjectNew />} />
                  <Route path="/subjects/:id" element={<SubjectProfile />} />
                  <Route path="/subjects/:id/edit" element={<SubjectEdit />} />

                  {/* Attendance - Admin can only view reports, teachers record via /teacher/attendance */}
	                  <Route path="/attendance" element={<Navigate to="/attendance/reports" replace />} />
                  <Route path="/attendance/reports" element={<AttendanceReportsPage />} />
                  
                  <Route path="/exams" element={<ExamsList />} />
                  <Route path="/exams/new" element={<ExamNew />} />
                  <Route path="/exams/:id" element={<ExamProfile />} />
                  <Route path="/exams/:id/edit" element={<ExamEdit />} />
                  <Route path="/exams/:id/preview" element={<ExamPreview />} />
                  
                  <Route path="/teachers" element={<TeachersList />} />
                  <Route path="/teachers/new" element={<TeacherNew />} />
                  <Route path="/teachers/:id" element={<TeacherProfile />} />
                  <Route path="/teachers/:id/edit" element={<TeacherEdit />} />

                  <Route path="/bank" element={<QuestionBank />} />
                  <Route path="/bank/topics" element={<TopicManager />} />
                  <Route path="/bank/new" element={<QuestionEditor />} />
                  <Route path="/bank/:id" element={<QuestionEditor />} />

                  <Route path="/exam2/:examId/author" element={<ExamAuthoring />} />
                  <Route path="/exam2/:examId/schedule" element={<ExamScheduling />} />
                  <Route path="/exam2/:examId/invigilator" element={<InvigilatorDashboard />} />
                  <Route path="/exam2/:examId/analytics" element={<ExamAnalytics />} />
                  <Route path="/exam2/:examId/questions/:qid/analytics" element={<QuestionAnalytics />} />
                  <Route path="/exam2/:examId/print" element={<PrintableExport />} />
                  <Route path="/exam2/grading" element={<ManualGradingQueue />} />
                  <Route path="/exam2/grade/:attemptId/:questionId" element={<RubricGrading />} />
                  <Route path="/exam2/accommodations" element={<AccommodationManagement />} />

                  <Route path="/gradebook" element={<GradebookPage />} />
                  <Route path="/gradebook/ged-readiness" element={<GedReadinessPage />} />
                  <Route path="/gradebook/reports" element={<GradebookClassReport />} />
                  <Route path="/gradebook/students/:studentId" element={<StudentProgress />} />

                  {/* Official documents (ADMIN/TEACHER) */}
                  <Route path="/documents" element={<DocumentsPage />} />
                </Route>

                <Route path="/exams/:id/take" element={<ExamTake />} />
                <Route path="/exams/:id/results" element={<ExamResults />} />

                <Route element={<ProtectedRoute requiredPermission="manage_users" />}>
                  <Route path="/users" element={<UsersList />} />
                  <Route path="/users/new" element={<UserNew />} />
                  <Route path="/users/:id/edit" element={<UserEdit />} />
                </Route>

                <Route element={<ProtectedRoute requiredPermission="manage_all" />}>
                  <Route path="/operations" element={<SchoolOperations />} />
                  <Route path="/chat/moderation" element={<ChatModeration />} />
                  <Route path="/chat/stickers" element={<ChatStickers />} />
                  <Route path="/staff" element={<StaffDirectory />} />
                  <Route path="/staff/departments" element={<Departments />} />
                  <Route path="/staff/:id" element={<StaffProfile />} />
                  <Route path="/leave" element={<Leave />} />
                  <Route path="/settings" element={<SettingsLayout />}>
                    <Route index element={<Navigate to="/settings/school" replace />} />
                    <Route path="school" element={<SchoolSettings />} />
                    <Route path="branding" element={<BrandingSettings />} />
                    <Route path="system" element={<SystemSettings />} />
                    <Route path="roles" element={<RolesPermissions />} />
                    <Route path="backup" element={<BackupAndRestore />} />
                    <Route path="audit-log" element={<AuditLogPage />} />
                    <Route path="export" element={<ExportDataPage />} />
                  </Route>
                </Route>

                <Route element={<ProtectedRoute requiredPermission="view_admissions" />}>
                  <Route path="/admissions" element={<AdmissionsList />} />
                  <Route path="/admissions/:id" element={<AdmissionDetail />} />
                </Route>

                <Route path="/library" element={<LibraryList />} />
                <Route path="/library/:id" element={<LibraryDetail />} />

                <Route element={<ProtectedRoute requiredPermission="manage_own_library" />}>
                  <Route path="/library/new" element={<LibraryNew />} />
                  <Route path="/library/:id/edit" element={<LibraryEdit />} />
                </Route>

                <Route path="/elibrary" element={<EbookList />} />
                <Route
                  path="/elibrary/:id/read"
                  element={
                    <Suspense fallback={<div className="py-20 text-center text-sm text-slate-500">Loading reader…</div>}>
                      <EbookReader />
                    </Suspense>
                  }
                />

                <Route element={<ProtectedRoute requiredPermission="manage_ebooks" />}>
                  <Route path="/elibrary/upload" element={<EbookUpload />} />
                  <Route path="/elibrary/:id/edit" element={<EbookEdit />} />
                </Route>

                <Route path="/videos" element={<VideoList />} />
                <Route path="/videos/:id" element={<VideoDetail />} />

                <Route element={<ProtectedRoute requiredPermission="manage_videos" />}>
                  <Route path="/videos/new" element={<VideoNew />} />
                  <Route path="/videos/:id/edit" element={<VideoEdit />} />
                </Route>

                <Route element={<ProtectedRoute requiredPermission="manage_books" />}>
                  <Route path="/books" element={<BooksList />} />
                  <Route path="/books/new" element={<BookNew />} />
                  <Route path="/books/:id" element={<BookDetail />} />
                  <Route path="/books/:id/edit" element={<BookEdit />} />
                </Route>

                <Route element={<ProtectedRoute requiredPermission="manage_fees" />}>
                  <Route path="/payroll" element={<Payroll />} />
                  <Route path="/fees" element={<FeesDashboard />} />
                  <Route path="/fees/payments/new" element={<PaymentNew />} />
                  <Route path="/fees/students/:id" element={<StudentFeeProfile />} />
                  <Route path="/fees/receipts/:id" element={<PaymentReceipt />} />
                </Route>
                
                <Route element={<ProtectedRoute requiredPermission="manage_cases" />}>
                  <Route path="/cases" element={<CasesDashboard />} />
                  <Route path="/cases/new" element={<CaseNew />} />
                  <Route path="/cases/:id" element={<CaseDetail />} />
                  <Route path="/cases/:id/edit" element={<CaseEdit />} />
                </Route>
                
                <Route element={<ProtectedRoute requiredPermission="view_reports" />}>
                  <Route path="/reports" element={<ReportsDashboard />} />
                  <Route path="/reports/attendance" element={<AttendanceReport />} />
                  <Route path="/reports/fees" element={<FeesReport />} />
                  <Route path="/reports/students" element={<StudentProfileReport />} />
                  <Route path="/reports/exams" element={<ExamResultsReport />} />
                  <Route path="/reports/classes" element={<ClassPerformanceReport />} />
                  <Route path="/reports/monthly-summary" element={<MonthlySummaryReport />} />
                </Route>
                
                <Route index element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-right" closeButton richColors />
        </BrowserRouter>
        </TooltipProvider>
      </SettingsProvider>
      </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
