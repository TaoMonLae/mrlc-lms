import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
const AppLayout = lazy(() => import("./components/layout/AppLayout").then((module) => ({ default: module.AppLayout })));
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
const LoginPage = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const DashboardPage = lazy(() => import("./pages/Dashboard"));
const MyProfile = lazy(() => import("./pages/MyProfile"));
const MyPayroll = lazy(() => import("./pages/hr/MyPayroll"));
import { PlaceholderPage } from "./pages/Placeholder";
const StudentsList = lazy(() => import("./pages/students/StudentsList"));
const StudentNew = lazy(() => import("./pages/students/StudentNew"));
const StudentProfile = lazy(() => import("./pages/students/StudentProfile"));
const StudentEdit = lazy(() => import("./pages/students/StudentEdit"));
const SessionAttendanceReport = lazy(() => import("./pages/reports/SessionAttendanceReport"));
const AttendanceAnalytics = lazy(() => import("./pages/analytics/AttendanceAnalytics"));
const BulkAttendance = lazy(() => import("./pages/teacher/BulkAttendance"));
const AttendanceReportsPage = lazy(() => import("./pages/attendance/AttendanceReports"));

const ExamNew = lazy(() => import("./pages/exams/ExamNew"));
const ExamProfile = lazy(() => import("./pages/exams/ExamProfile"));
const ExamTake = lazy(() => import("./pages/exams/ExamTake"));
const ExamResults = lazy(() => import("./pages/exams/ExamResults"));
const ExamsList = lazy(() => import("./pages/exams/ExamsList"));
const ExamPreview = lazy(() => import("./pages/exams/ExamPreview"));

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
const GuidedStudio = lazy(() => import("./pages/exams/GuidedStudio"));
const QuestionBank = lazy(() => import("./pages/bank/QuestionBank"));
const QuestionEditor = lazy(() => import("./pages/bank/QuestionEditor"));
const TopicManager = lazy(() => import("./pages/bank/TopicManager"));

const TeachersList = lazy(() => import("./pages/teachers/TeachersList"));
const TeacherNew = lazy(() => import("./pages/teachers/TeacherNew"));
const TeacherProfile = lazy(() => import("./pages/teachers/TeacherProfile"));
const TeacherEdit = lazy(() => import("./pages/teachers/TeacherEdit"));

const ClassesList = lazy(() => import("./pages/classes/ClassesList"));
const ClassNew = lazy(() => import("./pages/classes/ClassNew"));
const ClassProfile = lazy(() => import("./pages/classes/ClassProfile"));
const ClassEdit = lazy(() => import("./pages/classes/ClassEdit"));

const SubjectsList = lazy(() => import("./pages/subjects/SubjectsList"));
const SubjectNew = lazy(() => import("./pages/subjects/SubjectNew"));
const SubjectProfile = lazy(() => import("./pages/subjects/SubjectProfile"));
const SubjectEdit = lazy(() => import("./pages/subjects/SubjectEdit"));

const UsersList = lazy(() => import("./pages/users/UsersList"));
const UserNew = lazy(() => import("./pages/users/UserNew"));
const UserEdit = lazy(() => import("./pages/users/UserEdit"));

const LibraryList = lazy(() => import("./pages/library/LibraryList"));
const LibraryNew = lazy(() => import("./pages/library/LibraryNew"));
const LibraryDetail = lazy(() => import("./pages/library/LibraryDetail"));
const LibraryEdit = lazy(() => import("./pages/library/LibraryEdit"));

const EbookList = lazy(() => import("./pages/elibrary/EbookList"));
const EbookReader = lazy(() => import("./pages/elibrary/EbookReader"));
const EbookUpload = lazy(() => import("./pages/elibrary/EbookUpload"));
const EbookEdit = lazy(() => import("./pages/elibrary/EbookEdit"));
const GutenbergImport = lazy(() => import("./pages/elibrary/GutenbergImport"));
const EbookAnalytics = lazy(() => import("./pages/elibrary/EbookAnalytics"));

const FeesDashboard = lazy(() => import("./pages/fees/FeesDashboard"));
const PaymentNew = lazy(() => import("./pages/fees/PaymentNew"));
const StudentFeeProfile = lazy(() => import("./pages/fees/StudentFeeProfile"));
const PaymentReceipt = lazy(() => import("./pages/fees/PaymentReceipt"));
const VerifyPaymentReceipt = lazy(() => import("./pages/fees/VerifyPaymentReceipt"));

const ExpensesDashboard = lazy(() => import("./pages/expenses/ExpensesDashboard"));
const ExpenseNew = lazy(() => import("./pages/expenses/ExpenseNew"));
const ExpenseEdit = lazy(() => import("./pages/expenses/ExpenseEdit"));
const ExpenseDetail = lazy(() => import("./pages/expenses/ExpenseDetail"));

const VendorsPage = lazy(() => import("./pages/vendors/VendorsPage"));
const VendorNew = lazy(() => import("./pages/vendors/VendorNew"));
const VendorEdit = lazy(() => import("./pages/vendors/VendorEdit"));
const VendorDetail = lazy(() => import("./pages/vendors/VendorDetail"));

const BudgetsPage = lazy(() => import("./pages/budgets/BudgetsPage"));
const BudgetNew = lazy(() => import("./pages/budgets/BudgetNew"));
const BudgetDetail = lazy(() => import("./pages/budgets/BudgetDetail"));
const BudgetEdit = lazy(() => import("./pages/budgets/BudgetEdit"));

const FeeStructuresDashboard = lazy(() => import("./pages/fee-structures/FeeStructuresDashboard"));
const FeeStructureDetail = lazy(() => import("./pages/fee-structures/FeeStructureDetail"));
const FeeStructureNew = lazy(() => import("./pages/fee-structures/FeeStructureNew"));
const FeeStructureEdit = lazy(() => import("./pages/fee-structures/FeeStructureEdit"));
const FeeAssignmentsPage = lazy(() => import("./pages/fee-structures/FeeAssignmentsPage"));
const FeeDiscountsPage = lazy(() => import("./pages/fee-structures/FeeDiscountsPage"));

const FinancialDashboard = lazy(() => import("./pages/financial/FinancialDashboard"));
const BudgetVsActualReport = lazy(() => import("./pages/financial/BudgetVsActualReport"));
const IncomeExpenseReport = lazy(() => import("./pages/financial/IncomeExpenseReport"));
const MonthlyFinanceReport = lazy(() => import("./pages/financial/MonthlyFinanceReport"));
const DonationsDashboard = lazy(() => import("./pages/donations/DonationsDashboard"));
const CampaignsPage = lazy(() => import("./pages/donations/CampaignsPage"));
const DonorList = lazy(() => import("./pages/donations/DonorList"));
const DonorProfile = lazy(() => import("./pages/donations/DonorProfile"));
const DonorNew = lazy(() => import("./pages/donations/DonorNew"));
const DonorEdit = lazy(() => import("./pages/donations/DonorEdit"));
const DonationNew = lazy(() => import("./pages/donations/DonationNew"));
const DonationEdit = lazy(() => import("./pages/donations/DonationEdit"));
const CampaignNew = lazy(() => import("./pages/donations/CampaignNew"));

const DutiesDashboard = lazy(() => import("./pages/duties/DutiesDashboard"));
const DutyDefinitionsPage = lazy(() => import("./pages/duties/DutyDefinitionsPage"));
const DutyRostersPage = lazy(() => import("./pages/duties/DutyRostersPage"));
const DutyRosterDetail = lazy(() => import("./pages/duties/DutyRosterDetail"));
const StudentDutyView = lazy(() => import("./pages/duties/StudentDutyView"));
const DutyPerformancePage = lazy(() => import("./pages/duties/DutyPerformancePage"));
const CasesDashboard = lazy(() => import("./pages/cases/CasesDashboard"));
const ConductDashboard = lazy(() => import("./pages/conduct/ConductDashboard"));
const StudentSuccessHub = lazy(() => import("./pages/student-success/StudentSuccessHub"));
const CaseNew = lazy(() => import("./pages/cases/CaseNew"));
const CaseDetail = lazy(() => import("./pages/cases/CaseDetail"));
const CaseEdit = lazy(() => import("./pages/cases/CaseEdit"));

const ReportsDashboard = lazy(() => import("./pages/reports/ReportsDashboard"));
const AttendanceReport = lazy(() => import("./pages/reports/AttendanceReport"));
const FeesReport = lazy(() => import("./pages/reports/FeesReport"));
const StudentProfileReport = lazy(() => import("./pages/reports/StudentProfileReport"));
const ExamResultsReport = lazy(() => import("./pages/reports/ExamResultsReport"));
const ClassPerformanceReport = lazy(() => import("./pages/reports/ClassPerformanceReport"));
const MonthlySummaryReport = lazy(() => import("./pages/reports/MonthlySummaryReport"));
const SchoolOperations = lazy(() => import("./pages/operations/SchoolOperations"));
const TeacherMyProfile = lazy(() => import("./pages/teacher/MyProfile"));
const HomeworkList = lazy(() => import("./pages/teacher/HomeworkList"));
const HomeworkDetail = lazy(() => import("./pages/teacher/HomeworkDetail"));
const StudentHomework = lazy(() => import("./pages/student/StudentHomework"));
const FlashcardDecks = lazy(() => import("./pages/flashcards/FlashcardDecks"));
const FlashcardDeckForm = lazy(() => import("./pages/flashcards/FlashcardDeckForm"));
const StudentFlashcardDecks = lazy(() => import("./pages/flashcards/StudentFlashcardDecks"));
const StudentFlashcardStudy = lazy(() => import("./pages/flashcards/StudentFlashcardStudy"));
const FlashcardQuiz = lazy(() => import("./pages/flashcards/FlashcardQuiz"));
const FlashcardMatch = lazy(() => import("./pages/flashcards/FlashcardMatch"));
const FlashcardSpelling = lazy(() => import("./pages/flashcards/FlashcardSpelling"));
const FlashcardDeckProgress = lazy(() => import("./pages/flashcards/FlashcardDeckProgress"));
const StaffDirectory = lazy(() => import("./pages/hr/StaffDirectory"));
const StaffProfile = lazy(() => import("./pages/hr/StaffProfile"));
const Departments = lazy(() => import("./pages/hr/Departments"));
const Payroll = lazy(() => import("./pages/hr/Payroll"));
const Leave = lazy(() => import("./pages/hr/Leave"));
const PayslipPrint = lazy(() => import("./pages/hr/PayslipPrint"));
const PayrollRunPrint = lazy(() => import("./pages/hr/PayrollRunPrint"));
const ChatPage = lazy(() => import("./pages/chat/ChatPage"));
const SocialSpace = lazy(() => import("./pages/social/SocialSpace"));
const ChatModeration = lazy(() => import("./pages/chat/ChatModeration"));
const ChatStickers = lazy(() => import("./pages/chat/ChatStickers"));
const AdmissionsList = lazy(() => import("./pages/admissions/AdmissionsList"));
const AdmissionDetail = lazy(() => import("./pages/admissions/AdmissionDetail"));

const RolesPermissions = lazy(() => import("./pages/settings/RolesPermissions"));
const SettingsLayout = lazy(() => import("./pages/settings/SettingsLayout"));
const SchoolSettings = lazy(() => import("./pages/settings/SchoolSettings"));
const BrandingSettings = lazy(() => import("./pages/settings/BrandingSettings"));
const SystemSettings = lazy(() => import("./pages/settings/SystemSettings"));
const BackupAndRestore = lazy(() => import("./pages/settings/BackupAndRestore"));
const SystemHealth = lazy(() => import("./pages/settings/SystemHealth"));
const ExamDataManagement = lazy(() => import("./pages/settings/ExamDataManagement"));
const NewsSources = lazy(() => import("./pages/settings/NewsSources"));
const AuditLogPage = lazy(() => import("./pages/settings/AuditLog"));
const ExportDataPage = lazy(() => import("./pages/settings/ExportData"));

const NewsFeed = lazy(() => import("./pages/news/NewsFeed"));
const ArticleReader = lazy(() => import("./pages/news/ArticleReader"));

const SudokuSelectPage = lazy(() => import("./pages/games/sudoku/index"));
const SudokuPlayPage = lazy(() => import("./pages/games/sudoku/PlayPage"));
const SnakeSelectPage = lazy(() => import("./pages/games/snake/index"));
const SnakePlayPage = lazy(() => import("./pages/games/snake/PlayPage"));
const CheckersSelectPage = lazy(() => import("./pages/games/checkers/index"));
const CheckersPlayPage = lazy(() => import("./pages/games/checkers/PlayPage"));
const ChessSelectPage = lazy(() => import("./pages/games/chess/index"));
const ChessPlayPage = lazy(() => import("./pages/games/chess/PlayPage"));
const ChessLobbyPage = lazy(() => import("./pages/games/chess/Lobby"));
const ChessLeaderboardPage = lazy(() => import("./pages/games/chess/Leaderboard"));
const LanguageQuestHome = lazy(() => import("./pages/games/language-quest/LanguageQuestHome"));
const LanguageQuestCourse = lazy(() => import("./pages/games/language-quest/LanguageQuestCourse"));
const LanguageQuestLesson = lazy(() => import("./pages/games/language-quest/LanguageQuestLesson"));
const LanguageQuestLeaderboard = lazy(() => import("./pages/games/language-quest/LanguageQuestLeaderboard"));
const LanguageQuestManage = lazy(() => import("./pages/games/language-quest/LanguageQuestManage"));
const LanguageQuestEditor = lazy(() => import("./pages/games/language-quest/LanguageQuestEditor"));

const Dictionary = lazy(() => import("./pages/dictionary/Dictionary"));
const MonLanguage = lazy(() => import("./pages/MonLanguage"));
const AboutPage = lazy(() => import("./pages/About"));

const AnnouncementsList = lazy(() => import("./pages/announcements/AnnouncementsList"));
const AnnouncementNew = lazy(() => import("./pages/announcements/AnnouncementNew"));
const AnnouncementDetail = lazy(() => import("./pages/announcements/AnnouncementDetail"));
const AnnouncementEdit = lazy(() => import("./pages/announcements/AnnouncementEdit"));

const GradebookPage = lazy(() => import("./pages/gradebook/Gradebook"));
const GedReadinessPage = lazy(() => import("./pages/gradebook/GedReadiness"));
const StudentProgress = lazy(() => import("./pages/gradebook/StudentProgress"));
const GradebookClassReport = lazy(() => import("./pages/gradebook/GradebookClassReport"));

const DocumentsPage = lazy(() => import("./pages/documents/Documents"));
const DocumentPrint = lazy(() => import("./pages/documents/DocumentPrint"));
const VerifyDocument = lazy(() => import("./pages/documents/VerifyDocument"));
const StudentDocumentsPage = lazy(() => import("./pages/student/StudentDocuments"));

const TimetablePage = lazy(() => import("./pages/timetable/TimetablePage"));
const TimetableNew = lazy(() => import("./pages/timetable/TimetableNew"));
const TimetableEdit = lazy(() => import("./pages/timetable/TimetableEdit"));

const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const StudentProfilePage = lazy(() => import("./pages/student/StudentProfilePage"));
const StudentAttendance = lazy(() => import("./pages/student/StudentAttendance"));
const StudentExams = lazy(() => import("./pages/student/StudentExams"));
const StudentResults = lazy(() => import("./pages/student/StudentResults"));
const StudentLibrary = lazy(() => import("./pages/student/StudentLibrary"));
const StudentFees = lazy(() => import("./pages/student/StudentFees"));
const StudentVideos = lazy(() => import("./pages/student/StudentVideos"));

const TeacherDashboard = lazy(() => import("./pages/teacher/TeacherDashboard"));
const TeacherClasses = lazy(() => import("./pages/teacher/TeacherClasses"));
const ClassDetails = lazy(() => import("./pages/teacher/ClassDetails"));
const TeacherAttendance = lazy(() => import("./pages/teacher/TeacherAttendance"));
const TeacherExams = lazy(() => import("./pages/teacher/TeacherExams"));
const TeacherLibrary = lazy(() => import("./pages/teacher/TeacherLibrary"));
const TeacherReports = lazy(() => import("./pages/teacher/TeacherReports"));
const TeacherTimetable = lazy(() => import("./pages/teacher/TeacherTimetable"));
const TeacherVideos = lazy(() => import("./pages/teacher/TeacherVideos"));
const LessonPlanner = lazy(() => import("./pages/teacher/LessonPlanner"));

const VideoList = lazy(() => import("./pages/videos/VideoList"));
const VideoNew = lazy(() => import("./pages/videos/VideoNew"));
const VideoDetail = lazy(() => import("./pages/videos/VideoDetail"));
const VideoEdit = lazy(() => import("./pages/videos/VideoEdit"));

const BooksList = lazy(() => import("./pages/books/BooksList"));
const BookNew = lazy(() => import("./pages/books/BookNew"));
const BookDetail = lazy(() => import("./pages/books/BookDetail"));
const BookEdit = lazy(() => import("./pages/books/BookEdit"));

const UnauthorizedPage = lazy(() => import("./pages/Unauthorized"));
const NotFoundPage = lazy(() => import("./pages/NotFound"));

import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { SettingsProvider } from "./providers/SettingsProvider";
import { AuthProvider } from "./providers/AuthProvider";
import { I18nProvider } from "./i18n/I18nProvider";

const LandingPage = lazy(() => import("./pages/Landing"));
import CursorEffect from "./components/CursorEffect";
import DynamicFavicon from "./components/DynamicFavicon";

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="mrlc-lms-theme">
      <I18nProvider>
      <AuthProvider>
        <SettingsProvider>
        <TooltipProvider>
          <BrowserRouter>
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading page…</div>}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/verify/payment/:id" element={<VerifyPaymentReceipt />} />
            <Route path="/verify/:token" element={<VerifyDocument />} />

            {/* Dictionary — public, no sign-in required (also linked from inside the app) */}
            <Route path="/dictionary" element={<Dictionary />} />
            
            <Route element={<ProtectedRoute />}>
              <Route path="/change-password" element={<ChangePassword />} />
              <Route path="/documents/:id/print" element={<DocumentPrint />} />
              <Route path="/payroll/payslips/:id/print" element={<PayslipPrint />} />
              <Route path="/payroll/runs/:id/print" element={<PayrollRunPrint />} />
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/profile" element={<MyProfile />} />
                <Route path="/my-payroll" element={<MyPayroll />} />

                <Route element={<ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']} />}>
                  <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
                  <Route path="/teacher/classes" element={<TeacherClasses />} />
                  <Route path="/teacher/classes/:id" element={<ClassDetails />} />
                  <Route path="/teacher/attendance" element={<TeacherAttendance />} />

		                  <Route path="/teacher/bulk-attendance" element={<BulkAttendance />} />
                  <Route path="/teacher/exams" element={<TeacherExams />} />
                  <Route path="/teacher/library" element={<TeacherLibrary />} />
                  <Route path="/teacher/reports" element={<TeacherReports />} />
                  <Route path="/teacher/timetable" element={<TeacherTimetable />} />
                  <Route path="/teacher/videos" element={<TeacherVideos />} />
                  <Route path="/teacher/planner" element={<LessonPlanner />} />
                  <Route path="/teacher/profile" element={<TeacherMyProfile />} />
                  <Route path="/teacher/homework" element={<HomeworkList />} />
                  <Route path="/teacher/homework/:id" element={<HomeworkDetail />} />
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
                  <Route path="/student/fees/receipts/:id" element={<PaymentReceipt />} />
                  <Route path="/student/videos" element={<StudentVideos />} />
                  <Route path="/student/homework" element={<StudentHomework />} />
                  <Route path="/student/flashcards" element={<StudentFlashcardDecks />} />
                  <Route path="/student/flashcards/:id" element={<StudentFlashcardStudy />} />
                  <Route path="/student/flashcards/:id/quiz" element={<FlashcardQuiz />} />
                  <Route path="/student/flashcards/:id/match" element={<FlashcardMatch />} />
                  <Route path="/student/flashcards/:id/spell" element={<FlashcardSpelling />} />
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

                {/* News — daily-refreshed RSS digest, available to every authenticated role */}
                <Route path="/news" element={<NewsFeed />} />
                <Route path="/news/:id" element={<ArticleReader />} />

                {/* Embedded Mon language learning app — available to every authenticated role */}
                <Route path="/mon-language" element={<MonLanguage />} />

                {/* About / credits — available to every authenticated role */}
                <Route path="/about" element={<AboutPage />} />

                <Route path="/games/sudoku" element={<SudokuSelectPage />} />
                <Route path="/games/sudoku/play" element={<SudokuPlayPage />} />

                <Route path="/games/snake" element={<SnakeSelectPage />} />
                <Route path="/games/snake/play" element={<SnakePlayPage />} />

                <Route path="/games/checkers" element={<CheckersSelectPage />} />
                <Route path="/games/checkers/play" element={<CheckersPlayPage />} />

                <Route path="/games/chess" element={<ChessSelectPage />} />
                <Route path="/games/chess/play" element={<ChessPlayPage />} />
                <Route path="/games/chess/lobby" element={<ChessLobbyPage />} />
                <Route path="/games/chess/leaderboard" element={<ChessLeaderboardPage />} />

                <Route path="/games/language-quest" element={<LanguageQuestHome />} />
                <Route path="/games/language-quest/courses/:courseId" element={<LanguageQuestCourse />} />
                <Route path="/games/language-quest/lessons/:lessonId" element={<LanguageQuestLesson />} />
                <Route path="/games/language-quest/leaderboard" element={<LanguageQuestLeaderboard />} />

                <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']} />}>
                  <Route path="/games/language-quest/manage" element={<LanguageQuestManage />} />
                  <Route path="/games/language-quest/manage/new" element={<LanguageQuestEditor />} />
                  <Route path="/games/language-quest/manage/:id" element={<LanguageQuestEditor />} />
                </Route>

                <Route path="/timetable" element={<TimetablePage />} />

                <Route element={<ProtectedRoute requiredPermission="manage_students" />}>
                  <Route path="/students/new" element={<StudentNew />} />
                  <Route path="/students/:id/edit" element={<StudentEdit />} />
                </Route>

                <Route element={<ProtectedRoute requiredPermission="manage_teachers" />}>
                  <Route path="/teachers" element={<TeachersList />} />
                  <Route path="/teachers/new" element={<TeacherNew />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']} />}>
                  <Route path="/announcements/new" element={<AnnouncementNew />} />
                  <Route path="/announcements/:id/edit" element={<AnnouncementEdit />} />
                  <Route path="/timetable/new" element={<TimetableNew />} />
                  <Route path="/timetable/:id/edit" element={<TimetableEdit />} />
                  <Route path="/students" element={<StudentsList />} />
                  <Route path="/students/:id" element={<StudentProfile />} />
                  
                  <Route path="/classes" element={<ClassesList />} />
                  <Route path="/classes/new" element={<ClassNew />} />
                  <Route path="/classes/:id" element={<ClassProfile />} />
                  <Route path="/classes/:id/edit" element={<ClassEdit />} />
                  
                  <Route path="/subjects" element={<SubjectsList />} />
                  <Route path="/subjects/new" element={<SubjectNew />} />
                  <Route path="/subjects/:id" element={<SubjectProfile />} />
                  <Route path="/subjects/:id/edit" element={<SubjectEdit />} />

                  <Route path="/flashcards" element={<FlashcardDecks />} />
                  <Route path="/flashcards/new" element={<FlashcardDeckForm />} />
                  <Route path="/flashcards/:id/edit" element={<FlashcardDeckForm />} />
                  <Route path="/flashcards/:id/study" element={<StudentFlashcardStudy />} />
                  <Route path="/flashcards/:id/quiz" element={<FlashcardQuiz />} />
                  <Route path="/flashcards/:id/match" element={<FlashcardMatch />} />
                  <Route path="/flashcards/:id/spell" element={<FlashcardSpelling />} />
                  <Route path="/flashcards/:id/progress" element={<FlashcardDeckProgress />} />

                  {/* Attendance - Admin can only view reports, teachers record via /teacher/attendance */}
	                  <Route path="/attendance" element={<Navigate to="/attendance/reports" replace />} />
                  <Route path="/attendance/reports" element={<AttendanceReportsPage />} />

		                  <Route path="/attendance/session-reports" element={<SessionAttendanceReport />} />
                  
                  <Route path="/exams" element={<ExamsList />} />
                  <Route path="/exams/new" element={<ExamNew />} />
                  <Route path="/exams/:id" element={<ExamProfile />} />
                  {/* Classic edit removed — the Guided Studio is the only builder.
                      Keep the /edit path as a redirect so old links/bookmarks resolve. */}
                  <Route path="/exams/:id/edit" element={<GuidedStudio />} />
                  <Route path="/exams/:id/studio" element={<GuidedStudio />} />
                  <Route path="/exams/:id/preview" element={<ExamPreview />} />
                  
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
                    <Route path="news-sources" element={<NewsSources />} />
                    <Route path="backup" element={<BackupAndRestore />} />
                    <Route path="health" element={<SystemHealth />} />
                    <Route path="exam-records" element={<ExamDataManagement />} />
                  </Route>
                  {/* Standalone pages — not part of the settings sub-nav layout */}
                  <Route path="/settings/audit-log" element={<AuditLogPage />} />
                  <Route path="/settings/export" element={<ExportDataPage />} />
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
                  <Route path="/elibrary/gutenberg" element={<GutenbergImport />} />
                  <Route path="/elibrary/analytics" element={<EbookAnalytics />} />
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

                <Route element={<ProtectedRoute requiredPermission="view_expenses" />}>
                  <Route path="/expenses" element={<ExpensesDashboard />} />
                  <Route path="/expenses/new" element={<ExpenseNew />} />
                  <Route path="/expenses/:id/edit" element={<ExpenseEdit />} />
                  <Route path="/expenses/:id" element={<ExpenseDetail />} />
                </Route>

                <Route element={<ProtectedRoute requiredPermission="view_vendors" />}>
                  <Route path="/vendors" element={<VendorsPage />} />
                  <Route path="/vendors/new" element={<VendorNew />} />
                  <Route path="/vendors/:id/edit" element={<VendorEdit />} />
                  <Route path="/vendors/:id" element={<VendorDetail />} />
                </Route>

                <Route element={<ProtectedRoute requiredPermission="view_budgets" />}>
                  <Route path="/budgets" element={<BudgetsPage />} />
                  <Route path="/budgets/new" element={<BudgetNew />} />
                  <Route path="/budgets/:id/edit" element={<BudgetEdit />} />
                  <Route path="/budgets/:id" element={<BudgetDetail />} />
                </Route>

                <Route element={<ProtectedRoute requiredPermission="view_fee_structures" />}>
                  <Route path="/fee-structures" element={<FeeStructuresDashboard />} />
                  <Route path="/fee-structures/new" element={<FeeStructureNew />} />
                  <Route path="/fee-structures/:id/edit" element={<FeeStructureEdit />} />
                  <Route path="/fee-structures/:id" element={<FeeStructureDetail />} />
                  <Route path="/fee-assignments" element={<FeeAssignmentsPage />} />
                  <Route path="/fee-discounts" element={<FeeDiscountsPage />} />
                </Route>

                <Route element={<ProtectedRoute requiredPermission="view_financial_reports" />}>
                  <Route path="/financial" element={<FinancialDashboard />} />
                  <Route path="/financial/reports/budget-vs-actual" element={<BudgetVsActualReport />} />
                  <Route path="/financial/reports/income-expense" element={<IncomeExpenseReport />} />
                  <Route path="/financial/reports/monthly" element={<MonthlyFinanceReport />} />
                </Route>

                <Route element={<ProtectedRoute requiredPermission="manage_cases" />}>
                  <Route path="/cases" element={<CasesDashboard />} />
                  <Route path="/cases/new" element={<CaseNew />} />
                  <Route path="/cases/:id" element={<CaseDetail />} />
                  <Route path="/cases/:id/edit" element={<CaseEdit />} />
                </Route>

                <Route element={<ProtectedRoute requiredPermission="view_conduct" />}>
                  <Route path="/conduct" element={<ConductDashboard />} />
                </Route>

                <Route element={<ProtectedRoute requiredPermission="view_interventions" />}>
                  <Route path="/student-success" element={<StudentSuccessHub />} />
                </Route>

                <Route element={<ProtectedRoute requiredPermission="view_reports" />}>
                  <Route path="/reports" element={<ReportsDashboard />} />
                  <Route path="/reports/attendance" element={<AttendanceReport />} />

		                  <Route path="/analytics/attendance" element={<AttendanceAnalytics />} />
                  <Route path="/reports/fees" element={<FeesReport />} />
                  <Route path="/reports/students" element={<StudentProfileReport />} />
                  <Route path="/reports/exams" element={<ExamResultsReport />} />
                  <Route path="/reports/classes" element={<ClassPerformanceReport />} />
                  <Route path="/reports/monthly-summary" element={<MonthlySummaryReport />} />
                </Route>

                <Route element={<ProtectedRoute requiredPermission="view_donations" />}>
                  <Route path="/donations" element={<DonationsDashboard />} />
                  <Route path="/donations/campaigns" element={<CampaignsPage />} />
                  <Route path="/donations/campaigns/new" element={<CampaignNew />} />
                  <Route path="/donations/new" element={<DonationNew />} />
                  <Route path="/donations/:id/edit" element={<DonationEdit />} />
                  <Route path="/donors" element={<DonorList />} />
                  <Route path="/donors/new" element={<DonorNew />} />
                  <Route path="/donors/:id/edit" element={<DonorEdit />} />
                  <Route path="/donors/:id" element={<DonorProfile />} />
                </Route>

                <Route element={<ProtectedRoute requiredPermission="view_duties" />}>
                  <Route path="/duties" element={<DutiesDashboard />} />
                  <Route path="/duties/definitions" element={<DutyDefinitionsPage />} />
                  <Route path="/duties/rosters" element={<DutyRostersPage />} />
                  <Route path="/duties/rosters/:id" element={<DutyRosterDetail />} />
                  <Route path="/duties/performance" element={<DutyPerformancePage />} />
                </Route>

                <Route element={<ProtectedRoute requiredPermission="view_own_duties" />}>
                  <Route path="/student/duties" element={<StudentDutyView />} />
                </Route>

                <Route index element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Route>
            
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
          <Toaster position="top-right" closeButton richColors />
          <CursorEffect />
          <DynamicFavicon />
        </BrowserRouter>
        </TooltipProvider>
      </SettingsProvider>
      </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
