import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import LoginPage from "./pages/Login";
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

import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherClasses from "./pages/teacher/TeacherClasses";
import ClassDetails from "./pages/teacher/ClassDetails";
import TeacherAttendance from "./pages/teacher/TeacherAttendance";
import TeacherExams from "./pages/teacher/TeacherExams";
import TeacherLibrary from "./pages/teacher/TeacherLibrary";
import TeacherReports from "./pages/teacher/TeacherReports";
import TeacherTimetable from "./pages/teacher/TeacherTimetable";

import UnauthorizedPage from "./pages/Unauthorized";

import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { SettingsProvider } from "./providers/SettingsProvider";

import LandingPage from "./pages/Landing";

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="mrlc-lms-theme">
      <SettingsProvider>
        <TooltipProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            
            <Route element={<ProtectedRoute />}>
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
                  <Route path="/exams/:id/take" element={<ExamTake />} />
                  <Route path="/exams/:id/results" element={<ExamResults />} />
                  
                  <Route path="/teachers" element={<TeachersList />} />
                  <Route path="/teachers/new" element={<TeacherNew />} />
                  <Route path="/teachers/:id" element={<TeacherProfile />} />
                  <Route path="/teachers/:id/edit" element={<TeacherEdit />} />
                </Route>

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

                <Route path="/library" element={<LibraryList />} />
                <Route path="/library/new" element={<LibraryNew />} />
                <Route path="/library/:id" element={<LibraryDetail />} />
                <Route path="/library/:id/edit" element={<LibraryEdit />} />
                
                <Route element={<ProtectedRoute requiredPermission="manage_fees" />}>
                  <Route path="/fees" element={<FeesDashboard />} />
                  <Route path="/fees/payments/new" element={<PaymentNew />} />
                </Route>
                <Route path="/fees/students/:id" element={<StudentFeeProfile />} />
                <Route path="/fees/receipts/:id" element={<PaymentReceipt />} />
                
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
    </ThemeProvider>
  );
}

