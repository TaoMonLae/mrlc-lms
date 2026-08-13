import {
  LayoutDashboard,
  Users,
  UserSquare2,
  Library,
  BookOpen,
  CalendarCheck,
  FileCheck,
  Wallet,
  AlertCircle,
  BarChart3,
  Settings,
  Briefcase,
  Megaphone,
  MessageSquare,
  Sparkles,
  CalendarDays,
  GraduationCap,
  UserCheck,
  FileText,
  Download,
  Video,
  BookMarked,
  Tablet,
  ClipboardList,
  UserPlus,
  Newspaper,
  Heart,
  Layers,
  ShieldAlert,
  Grid3x3,
  BookA,
  BookOpenText,
  Turtle,
  Gamepad2,
  Dice5,
  HeartPulse,
  Crown,
  Languages,
  Info,
  Target,
  Map,
  Ghost,
  ShieldCheck,
  Atom,
} from "lucide-react";
import { UserRole } from "./permissions";

export interface NavItem {
  title: string;
  url: string;
  icon: any;
  roles?: UserRole[];
}

export interface NavGroup {
  label: string;
  icon: any;
  items: NavGroupItem[];
}

export interface NavGroupItem {
  title: string;
  url: string;
  icon: any;
}

export type AdminNavEntry = { title: string; url: string; icon: any } | NavGroup;

export const isNavGroup = (e: AdminNavEntry): e is NavGroup => 'items' in e;

const COMMUNITY_ITEMS: NavGroupItem[] = [
  { title: "Announcements", url: "/announcements", icon: Megaphone },
  { title: "Chat", url: "/chat", icon: MessageSquare },
  { title: "Social Space", url: "/social", icon: Sparkles },
  { title: "News", url: "/news", icon: Newspaper },
];

const LEARNING_TOOL_ITEMS: NavGroupItem[] = [
  { title: "Learning Quest", url: "/games/language-quest", icon: Languages },
  { title: "Mon Language", url: "/mon-language", icon: BookOpenText },
  { title: "Dictionary", url: "/dictionary", icon: BookA },
];

const LEARNER_LEARNING_TOOL_ITEMS: NavGroupItem[] = [
  { title: "Daily Quest", url: "/daily-quest", icon: Target },
  ...LEARNING_TOOL_ITEMS,
];

const GAME_ITEMS: NavGroupItem[] = [
  { title: "Snake Game", url: "/games/snake", icon: Turtle },
  { title: "Sudoku", url: "/games/sudoku", icon: Grid3x3 },
  { title: "Checkers", url: "/games/checkers", icon: Dice5 },
  { title: "Chess", url: "/games/chess", icon: Crown },
  { title: "Pac-Man", url: "/games/pacman", icon: Ghost },
  { title: "Periodic Table", url: "/games/periodic-table", icon: Atom },
];

const LEARNER_GAME_ITEMS: NavGroupItem[] = [
  { title: "Word Trail", url: "/games/word-trail", icon: Map },
  ...GAME_ITEMS,
];

const GAME_CONTROL_ITEM: NavGroupItem = {
  title: "Game Time Controls",
  url: "/games/controls",
  icon: ShieldCheck,
};

/** Grouped sidebar structure for the ADMIN role. */
export const ADMIN_NAV: AdminNavEntry[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  {
    label: "Academics",
    icon: BookOpen,
    items: [
      { title: "Timetable", url: "/timetable", icon: CalendarDays },
      { title: "Classes", url: "/classes", icon: BookOpen },
      { title: "Subjects", url: "/subjects", icon: BookOpen },
      { title: "Homework", url: "/teacher/homework", icon: FileText },
      { title: "Exams", url: "/exams", icon: FileCheck },
      { title: "Gradebook", url: "/gradebook", icon: ClipboardList },
      { title: "GED Readiness", url: "/gradebook/ged-readiness", icon: GraduationCap },
      { title: "Class Performance", url: "/gradebook/reports", icon: BarChart3 },
      { title: "Documents", url: "/documents", icon: FileText },
      { title: "Flashcards", url: "/flashcards", icon: Layers },
    ],
  },
  {
    label: "People",
    icon: Users,
    items: [
      { title: "Students", url: "/students", icon: Users },
      { title: "Admissions", url: "/admissions", icon: UserPlus },
      { title: "Teachers", url: "/teachers", icon: UserSquare2 },
      { title: "Staff", url: "/staff", icon: UserSquare2 },
      { title: "Users & Roles", url: "/users", icon: Briefcase },
    ],
  },
  {
    label: "Attendance",
    icon: CalendarCheck,
    items: [
      { title: "Daily Reports", url: "/attendance/reports", icon: CalendarCheck },
      { title: "Session Reports", url: "/attendance/session-reports", icon: CalendarDays },
      { title: "Analytics", url: "/analytics/attendance", icon: BarChart3 },
    ],
  },
  { label: "Learning Tools", icon: GraduationCap, items: LEARNING_TOOL_ITEMS },
  {
    label: "Resources",
    icon: Library,
    items: [
      { title: "Library", url: "/library", icon: Library },
      { title: "E-Library", url: "/elibrary", icon: Tablet },
      { title: "Reading Analytics", url: "/elibrary/analytics", icon: BarChart3 },
      { title: "Video Lessons", url: "/videos", icon: Video },
      { title: "Book Catalog", url: "/books", icon: BookMarked },
    ],
  },
  { label: "Games", icon: Gamepad2, items: [GAME_CONTROL_ITEM, ...GAME_ITEMS] },
  { label: "Community", icon: MessageSquare, items: COMMUNITY_ITEMS },
  {
    label: "Finance & HR",
    icon: Wallet,
    items: [
      { title: "Financial Dashboard", url: "/financial", icon: BarChart3 },
      { title: "Fees", url: "/fees", icon: Wallet },
      { title: "Fee Structures", url: "/fee-structures", icon: Wallet },
      { title: "Donations", url: "/donations", icon: Heart },
      { title: "Donors", url: "/donors", icon: Heart },
      { title: "Expenses", url: "/expenses", icon: Wallet },
      { title: "Vendors", url: "/vendors", icon: UserSquare2 },
      { title: "Budgets", url: "/budgets", icon: BarChart3 },
      { title: "Payroll", url: "/payroll", icon: Wallet },
      { title: "Leave", url: "/leave", icon: CalendarCheck },
    ],
  },
  {
    label: "Operations",
    icon: ClipboardList,
    items: [
      { title: "School Operations", url: "/operations", icon: ClipboardList },
      { title: "Student Duties", url: "/duties", icon: CalendarCheck },
      { title: "Cases", url: "/cases", icon: AlertCircle },
      { title: "Student Success", url: "/student-success", icon: HeartPulse },
      { title: "Conduct", url: "/conduct", icon: ShieldAlert },
      { title: "Reports", url: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    icon: Settings,
    items: [
      { title: "Settings", url: "/settings", icon: Settings },
      { title: "Account & Security", url: "/profile", icon: ShieldAlert },
      { title: "Audit Log", url: "/settings/audit-log", icon: FileText },
      { title: "Export Data", url: "/settings/export", icon: Download },
      { title: "About", url: "/about", icon: Info },
    ],
  },
];

/** Grouped sidebar for the TEACHER role. */
export const TEACHER_NAV: AdminNavEntry[] = [
  { title: "Dashboard", url: "/teacher/dashboard", icon: LayoutDashboard },
  {
    label: "My Teaching",
    icon: BookOpen,
    items: [
      { title: "My Timetable", url: "/teacher/timetable", icon: CalendarDays },
      { title: "My Classes", url: "/teacher/classes", icon: BookOpen },
      { title: "Homework", url: "/teacher/homework", icon: FileText },
      { title: "Lesson Planner", url: "/teacher/planner", icon: ClipboardList },
      { title: "Exams", url: "/teacher/exams", icon: FileCheck },
      { title: "Gradebook", url: "/gradebook", icon: ClipboardList },
      { title: "GED Readiness", url: "/gradebook/ged-readiness", icon: GraduationCap },
      { title: "Class Performance", url: "/gradebook/reports", icon: BarChart3 },
      { title: "Documents", url: "/documents", icon: FileText },
      { title: "Flashcards", url: "/flashcards", icon: Layers },
      { title: "Conduct", url: "/conduct", icon: ShieldAlert },
      { title: "Student Success", url: "/student-success", icon: HeartPulse },
    ],
  },
  {
    label: "Attendance",
    icon: UserCheck,
    items: [
      { title: "Take Attendance", url: "/teacher/attendance", icon: UserCheck },
      { title: "Bulk Attendance", url: "/teacher/bulk-attendance", icon: CalendarDays },
      { title: "Session Reports", url: "/attendance/session-reports", icon: CalendarCheck },
      { title: "Analytics", url: "/analytics/attendance", icon: BarChart3 },
    ],
  },
  { label: "Learning Tools", icon: GraduationCap, items: LEARNER_LEARNING_TOOL_ITEMS },
  {
    label: "Resources",
    icon: Library,
    items: [
      { title: "Teaching Resources", url: "/teacher/library", icon: Library },
      { title: "E-Library", url: "/elibrary", icon: Tablet },
      { title: "Reading Analytics", url: "/elibrary/analytics", icon: BarChart3 },
      { title: "Video Lessons", url: "/teacher/videos", icon: Video },
    ],
  },
  { label: "Games", icon: Gamepad2, items: [GAME_CONTROL_ITEM, ...LEARNER_GAME_ITEMS] },
  { label: "Community", icon: MessageSquare, items: COMMUNITY_ITEMS },
  {
    label: "My Account",
    icon: UserSquare2,
    items: [
      { title: "Reports", url: "/teacher/reports", icon: BarChart3 },
      { title: "My Payroll", url: "/my-payroll", icon: Wallet },
      { title: "My Profile", url: "/teacher/profile", icon: UserSquare2 },
      { title: "Account & Security", url: "/profile", icon: ShieldAlert },
      { title: "About", url: "/about", icon: Info },
    ],
  },
];

/** Grouped sidebar for the STUDENT role. */
export const STUDENT_NAV: AdminNavEntry[] = [
  { title: "Dashboard", url: "/student/dashboard", icon: LayoutDashboard },
  {
    label: "My Learning",
    icon: GraduationCap,
    items: [
      { title: "My Timetable", url: "/timetable", icon: CalendarDays },
      { title: "Homework", url: "/student/homework", icon: FileText },
      { title: "Exams", url: "/student/exams", icon: FileCheck },
      { title: "My Results", url: "/student/results", icon: GraduationCap },
      { title: "My Progress", url: "/student/grades", icon: ClipboardList },
      { title: "My Attendance", url: "/student/attendance", icon: CalendarCheck },
      { title: "My Documents", url: "/student/documents", icon: FileText },
      { title: "My Fees", url: "/student/fees", icon: Wallet },
      { title: "My Duties", url: "/student/duties", icon: ClipboardList },
      { title: "Flashcards", url: "/student/flashcards", icon: Layers },
    ],
  },
  { label: "Learning Tools", icon: GraduationCap, items: LEARNER_LEARNING_TOOL_ITEMS },
  {
    label: "Resources",
    icon: Library,
    items: [
      { title: "Library", url: "/student/library", icon: Library },
      { title: "E-Library", url: "/elibrary", icon: Tablet },
      { title: "Video Lessons", url: "/student/videos", icon: Video },
    ],
  },
  { label: "Games", icon: Gamepad2, items: LEARNER_GAME_ITEMS },
  { label: "Community", icon: MessageSquare, items: COMMUNITY_ITEMS },
  {
    label: "My Account",
    icon: UserSquare2,
    items: [
      { title: "My Profile", url: "/student/profile", icon: UserSquare2 },
      { title: "Account & Security", url: "/profile", icon: ShieldAlert },
      { title: "About", url: "/about", icon: Info },
    ],
  },
];

/** Roles with a grouped sidebar; everyone else gets the flat list. */
export const ROLE_NAV: Partial<Record<UserRole, AdminNavEntry[]>> = {
  ADMIN: ADMIN_NAV,
  TEACHER: TEACHER_NAV,
  STUDENT: STUDENT_NAV,
};

export const NAVIGATION_ITEMS: NavItem[] = [
  // Admin / General Navigation
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN"],
  },
  {
    title: "Timetable",
    url: "/timetable",
    icon: CalendarDays,
    roles: ["ADMIN"],
  },
  {
    title: "Announcements",
    url: "/announcements",
    icon: Megaphone,
    roles: ["ADMIN", "TEACHER", "STUDENT"],
  },
  {
    title: "Chat",
    url: "/chat",
    icon: MessageSquare,
    roles: ["ADMIN", "TEACHER", "STUDENT", "STAFF", "ACCOUNTANT", "CASE_WORKER", "LIBRARIAN"],
  },
  {
    title: "Social Space",
    url: "/social",
    icon: Sparkles,
    roles: ["ADMIN", "TEACHER", "STUDENT", "STAFF", "ACCOUNTANT", "CASE_WORKER", "LIBRARIAN"],
  },
  {
    title: "News",
    url: "/news",
    icon: Newspaper,
    roles: ["ADMIN", "TEACHER", "STUDENT", "STAFF", "ACCOUNTANT", "CASE_WORKER", "LIBRARIAN"],
  },
  {
    title: "Daily Quest",
    url: "/daily-quest",
    icon: Target,
    roles: ["TEACHER", "STUDENT"],
  },
  {
    title: "Learning Quest",
    url: "/games/language-quest",
    icon: Languages,
  },
  {
    title: "Game Time Controls",
    url: "/games/controls",
    icon: ShieldCheck,
    roles: ["ADMIN", "TEACHER"],
  },
  {
    title: "Sudoku",
    url: "/games/sudoku",
    icon: Grid3x3,
  },
  {
    title: "Word Trail",
    url: "/games/word-trail",
    icon: Map,
    roles: ["TEACHER", "STUDENT"],
  },
  {
    title: "Snake Game",
    url: "/games/snake",
    icon: Turtle,
  },
  {
    title: "Checkers",
    url: "/games/checkers",
    icon: Dice5,
  },
  {
    title: "Chess",
    url: "/games/chess",
    icon: Crown,
  },
  {
    title: "Pac-Man",
    url: "/games/pacman",
    icon: Ghost,
  },
  {
    title: "Periodic Table",
    url: "/games/periodic-table",
    icon: Atom,
  },
  {
    title: "Dictionary",
    url: "/dictionary",
    icon: BookA,
  },
  {
    title: "Mon Language",
    url: "/mon-language",
    icon: BookOpenText,
  },
  {
    title: "Students",
    url: "/students",
    icon: Users,
    roles: ["ADMIN"],
  },
  {
    title: "Admissions",
    url: "/admissions",
    icon: UserPlus,
    roles: ["ADMIN", "STAFF"],
  },
  {
    title: "Teachers",
    url: "/teachers",
    icon: UserSquare2,
    roles: ["ADMIN"],
  },
  {
    title: "Classes",
    url: "/classes",
    icon: BookOpen,
    roles: ["ADMIN"],
  },
  {
    title: "Subjects",
    url: "/subjects",
    icon: BookOpen,
    roles: ["ADMIN"],
  },
  {
    title: "Attendance",
    url: "/attendance/reports",
    icon: CalendarCheck,
    roles: ["ADMIN"],
  },
  {
    title: "Session Attendance",
    url: "/attendance/session-reports",
    icon: CalendarDays,
    roles: ["ADMIN", "TEACHER"],
  },
  {
    title: "Attendance Analytics",
    url: "/analytics/attendance",
    icon: BarChart3,
    roles: ["ADMIN", "TEACHER"],
  },
  {
    title: "Exams",
    url: "/exams",
    icon: FileCheck,
    roles: ["ADMIN"],
  },
  {
    title: "Gradebook",
    url: "/gradebook",
    icon: ClipboardList,
    roles: ["ADMIN", "TEACHER"],
  },
  {
    title: "GED Readiness",
    url: "/gradebook/ged-readiness",
    icon: GraduationCap,
    roles: ["ADMIN", "TEACHER"],
  },
  {
    title: "Class Performance",
    url: "/gradebook/reports",
    icon: BarChart3,
    roles: ["ADMIN", "TEACHER"],
  },
  {
    title: "Documents",
    url: "/documents",
    icon: FileText,
    roles: ["ADMIN", "TEACHER"],
  },
  {
    title: "Library",
    url: "/library",
    icon: Library,
    roles: ["ADMIN"],
  },
  {
    title: "E-Library",
    url: "/elibrary",
    icon: Tablet,
    roles: ["ADMIN"],
  },
  {
    title: "Video Lessons",
    url: "/videos",
    icon: Video,
    roles: ["ADMIN"],
  },
  {
    title: "Book Catalog",
    url: "/books",
    icon: BookMarked,
    roles: ["ADMIN", "LIBRARIAN"],
  },
  {
    title: "E-Library",
    url: "/elibrary",
    icon: Tablet,
    roles: ["LIBRARIAN"],
  },
  {
    title: "Fees",
    url: "/fees",
    icon: Wallet,
    roles: ["ADMIN", "ACCOUNTANT"],
  },
  {
    title: "Fee Structures",
    url: "/fee-structures",
    icon: Wallet,
    roles: ["ADMIN", "ACCOUNTANT", "STAFF"],
  },
  {
    title: "Financial Dashboard",
    url: "/financial",
    icon: BarChart3,
    roles: ["ADMIN", "ACCOUNTANT", "STAFF"],
  },
  {
    title: "Expenses",
    url: "/expenses",
    icon: Wallet,
    roles: ["ADMIN", "ACCOUNTANT", "STAFF"],
  },
  {
    title: "Vendors",
    url: "/vendors",
    icon: UserSquare2,
    roles: ["ADMIN", "ACCOUNTANT", "STAFF"],
  },
  {
    title: "Budgets",
    url: "/budgets",
    icon: BarChart3,
    roles: ["ADMIN", "ACCOUNTANT", "STAFF"],
  },
  {
    title: "Donations",
    url: "/donations",
    icon: Heart,
    roles: ["ADMIN", "ACCOUNTANT", "STAFF"],
  },
  {
    title: "Donors",
    url: "/donors",
    icon: Heart,
    roles: ["ADMIN", "ACCOUNTANT", "STAFF"],
  },
  {
    title: "Student Duties",
    url: "/duties",
    icon: CalendarCheck,
    roles: ["ADMIN", "STAFF"],
  },
  {
    title: "Cases",
    url: "/cases",
    icon: AlertCircle,
    roles: ["ADMIN", "CASE_WORKER"],
  },
  {
    title: "Student Success",
    url: "/student-success",
    icon: HeartPulse,
    roles: ["ADMIN", "TEACHER", "CASE_WORKER"],
  },
  {
    title: "Conduct",
    url: "/conduct",
    icon: ShieldAlert,
    roles: ["ADMIN", "TEACHER", "CASE_WORKER", "STAFF"],
  },
  {
    title: "Account & Security",
    url: "/profile",
    icon: ShieldAlert,
    roles: ["STAFF", "ACCOUNTANT", "CASE_WORKER", "LIBRARIAN"],
  },
  {
    title: "Operations",
    url: "/operations",
    icon: ClipboardList,
    roles: ["ADMIN"],
  },
  {
    title: "Staff",
    url: "/staff",
    icon: UserSquare2,
    roles: ["ADMIN"],
  },
  {
    title: "Payroll",
    url: "/payroll",
    icon: Wallet,
    roles: ["ADMIN", "ACCOUNTANT"],
  },
  {
    title: "My Payroll",
    url: "/my-payroll",
    icon: Wallet,
    roles: ["STAFF", "ACCOUNTANT", "CASE_WORKER", "LIBRARIAN"],
  },
  {
    title: "Leave",
    url: "/leave",
    icon: CalendarCheck,
    roles: ["ADMIN"],
  },
  {
    title: "Reports",
    url: "/reports",
    icon: BarChart3,
    roles: ["ADMIN"],
  },
  {
    title: "Users",
    url: "/users",
    icon: Briefcase,
    roles: ["ADMIN"],
  },
  {
    title: "Audit Log",
    url: "/settings/audit-log",
    icon: FileText,
    roles: ["ADMIN"],
  },
  {
    title: "Export Data",
    url: "/settings/export",
    icon: Download,
    roles: ["ADMIN"],
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    roles: ["ADMIN"],
  },
  
  // Teacher Portal
  {
    title: "Teacher Dashboard",
    url: "/teacher/dashboard",
    icon: LayoutDashboard,
    roles: ["TEACHER"],
  },
  {
    title: "My Classes",
    url: "/teacher/classes",
    icon: BookOpen,
    roles: ["TEACHER"],
  },
  {
    title: "Teacher Timetable",
    url: "/teacher/timetable",
    icon: CalendarDays,
    roles: ["TEACHER"],
  },
  {
    title: "Take Attendance",
    url: "/teacher/attendance",
    icon: UserCheck,
    roles: ["TEACHER"],
  },
  {
    title: "Bulk Attendance",
    url: "/teacher/bulk-attendance",
    icon: CalendarDays,
    roles: ["TEACHER"],
  },
  {
    title: "Teacher Exams",
    url: "/teacher/exams",
    icon: FileText,
    roles: ["TEACHER"],
  },
  {
    title: "Teaching Resources",
    url: "/teacher/library",
    icon: Library,
    roles: ["TEACHER"],
  },
  {
    title: "E-Library",
    url: "/elibrary",
    icon: Tablet,
    roles: ["TEACHER"],
  },
  {
    title: "Video Lessons",
    url: "/teacher/videos",
    icon: Video,
    roles: ["TEACHER"],
  },
  {
    title: "Teacher Reports",
    url: "/teacher/reports",
    icon: BarChart3,
    roles: ["TEACHER"],
  },

  // Student Portal
  {
    title: "Student Dashboard",
    url: "/student/dashboard",
    icon: LayoutDashboard,
    roles: ["STUDENT"],
  },
  {
    title: "Student Attendance",
    url: "/student/attendance",
    icon: CalendarCheck,
    roles: ["STUDENT"],
  },
  {
    title: "Student Timetable",
    url: "/timetable",
    icon: CalendarDays,
    roles: ["STUDENT"],
  },
  {
    title: "Student Exams",
    url: "/student/exams",
    icon: FileCheck,
    roles: ["STUDENT"],
  },
  {
    title: "My Results",
    url: "/student/results",
    icon: GraduationCap,
    roles: ["STUDENT"],
  },
  {
    title: "My Progress",
    url: "/student/grades",
    icon: ClipboardList,
    roles: ["STUDENT"],
  },
  {
    title: "My Documents",
    url: "/student/documents",
    icon: FileText,
    roles: ["STUDENT"],
  },
  {
    title: "Student Fees",
    url: "/student/fees",
    icon: Wallet,
    roles: ["STUDENT"],
  },
  {
    title: "Student Library",
    url: "/student/library",
    icon: Library,
    roles: ["STUDENT"],
  },
  {
    title: "E-Library",
    url: "/elibrary",
    icon: Tablet,
    roles: ["STUDENT"],
  },
  {
    title: "Video Lessons",
    url: "/student/videos",
    icon: Video,
    roles: ["STUDENT"],
  },

  // About — last item, visible to everyone
  {
    title: "About",
    url: "/about",
    icon: Info,
  },
];
