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
import AttendancePage from "./pages/attendance/AttendancePage";
import AttendanceReportsPage from "./pages/attendance/AttendanceReports";

import ExamNew from "./pages/exams/ExamNew";
import ExamProfile from "./pages/exams/ExamProfile";
import ExamEdit from "./pages/exams/ExamEdit";
import ExamTake from "./pages/exams/ExamTake";
import ExamResults from "./pages/exams/ExamResults";
import ExamsList from "./pages/exams/ExamsList";

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
// Lazy-loaded: pulls in pdf.js/epub.js (+ a web worker) only when reading.
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
            
            <Route element={<ProtectedRoute />}>
              {/* Standalone (no app shell, bypasses the change-password gate) */}
              <Route path="/change-password" element={<ChangePassword />} />
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                
                {/* Teacher Portal Routes */}
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
                </Route>
                
                {/* Student Portal Routes */}
                <Route element={<ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']} />}>
                  <Route path="/student/dashboard" element={<StudentDashboard />} />
                  <Route path="/student/profile" element={<StudentProfilePage />} />
                  <Route path="/student/attendance" element={<StudentAttendance />} />
                  <Route path="/student/exams" element={<StudentExams />} />
                  <Route path="/student/results" element={<StudentResults />} />
                  <Route path="/student/library" element={<StudentLibrary />} />
                  <Route path="/student/fees" element={<StudentFees />} />
                  <Route path="/student/videos" element={<StudentVideos />} />
                </Route>
                
                <Route path="/announcements" element={<AnnouncementsList />} />
                <Route path="/announcements/:id" element={<AnnouncementDetail />} />

                <Route path="/timetable" element={<TimetablePage />} />

                {/* Admin/Teacher routes */}
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

                  <Route path="/attendance" element={<AttendancePage />} />
                  <Route path="/attendance/reports" element={<AttendanceReportsPage />} />
                  
                  <Route path="/exams" element={<ExamsList />} />
                  <Route path="/exams/new" element={<ExamNew />} />
                  <Route path="/exams/:id" element={<ExamProfile />} />
                  <Route path="/exams/:id/edit" element={<ExamEdit />} />
                  
                  <Route path="/teachers" element={<TeachersList />} />
                  <Route path="/teachers/new" element={<TeacherNew />} />
                  <Route path="/teachers/:id" element={<TeacherProfile />} />
                  <Route path="/teachers/:id/edit" element={<TeacherEdit />} />
                </Route>

                {/* Exam take/results: accessible to all authenticated roles */}
                <Route path="/exams/:id/take" element={<ExamTake />} />
                <Route path="/exams/:id/results" element={<ExamResults />} />

                {/* Users module - Admin only */}
                <Route element={<ProtectedRoute requiredPermission="manage_users" />}>
                  <Route path="/users" element={<UsersList />} />
                  <Route path="/users/new" element={<UserNew />} />
                  <Route path="/users/:id/edit" element={<UserEdit />} />
                </Route>

                {/* Admin only */}
                <Route element={<ProtectedRoute requiredPermission="manage_all" />}>
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

                {/* Library: read routes open to all authenticated users */}
                <Route path="/library" element={<LibraryList />} />
                <Route path="/library/:id" element={<LibraryDetail />} />

                {/* Library: write routes require manage_own_library (ADMIN, TEACHER) */}
                <Route element={<ProtectedRoute requiredPermission="manage_own_library" />}>
                  <Route path="/library/new" element={<LibraryNew />} />
                  <Route path="/library/:id/edit" element={<LibraryEdit />} />
                </Route>

                {/* E-Library: read + online reader open to all authenticated users */}
                <Route path="/elibrary" element={<EbookList />} />
                <Route
                  path="/elibrary/:id/read"
                  element={
                    <Suspense fallback={<div className="py-20 text-center text-sm text-slate-500">Loading reader…</div>}>
                      <EbookReader />
                    </Suspense>
                  }
                />

                {/* E-Library: upload/edit require manage_ebooks (ADMIN, TEACHER, LIBRARIAN) */}
                <Route element={<ProtectedRoute requiredPermission="manage_ebooks" />}>
                  <Route path="/elibrary/upload" element={<EbookUpload />} />
                  <Route path="/elibrary/:id/edit" element={<EbookEdit />} />
                </Route>

                {/* Video Lessons: read open to all authenticated users */}
                <Route path="/videos" element={<VideoList />} />
                <Route path="/videos/:id" element={<VideoDetail />} />

                {/* Video Lessons: write requires manage_videos (ADMIN, TEACHER) */}
                <Route element={<ProtectedRoute requiredPermission="manage_videos" />}>
                  <Route path="/videos/new" element={<VideoNew />} />
                  <Route path="/videos/:id/edit" element={<VideoEdit />} />
                </Route>

                {/* Physical Book Catalog: ADMIN + LIBRARIAN (via manage_books) */}
                <Route element={<ProtectedRoute requiredPermission="manage_books" />}>
                  <Route path="/books" element={<BooksList />} />
                  <Route path="/books/new" element={<BookNew />} />
                  <Route path="/books/:id" element={<BookDetail />} />
                  <Route path="/books/:id/edit" element={<BookEdit />} />
                </Route>

                <Route element={<ProtectedRoute requiredPermission="manage_fees" />}>
                  <Route path="/fees" element={<FeesDashboard />} />
                  <Route path="/fees/payments/new" element={<PaymentNew />} />
                  {/* Fee detail pages also contain sensitive financial data */}
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

