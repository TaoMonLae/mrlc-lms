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
  UserPlus
} from "lucide-react";
import { UserRole } from "./permissions";

export interface NavItem {
  title: string;
  url: string;
  icon: any;
  roles?: UserRole[];
}

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
    title: "Cases",
    url: "/cases",
    icon: AlertCircle,
    roles: ["ADMIN", "CASE_WORKER"],
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
    title: "Teacher Library",
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
];
