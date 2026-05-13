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
  CalendarDays,
  GraduationCap,
  UserCheck,
  FileText,
  Download
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
    title: "Students",
    url: "/students",
    icon: Users,
    roles: ["ADMIN"],
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
    url: "/attendance",
    icon: CalendarCheck,
    roles: ["ADMIN"],
  },
  {
    title: "Exams",
    url: "/exams",
    icon: FileCheck,
    roles: ["ADMIN"],
  },
  {
    title: "Library",
    url: "/library",
    icon: Library,
    roles: ["ADMIN"],
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
    title: "Teacher Reports",
    url: "/teacher/reports",
    icon: BarChart3,
    roles: ["TEACHER"],
  },

  // Staff Portal
  {
    title: "Announcements",
    url: "/announcements",
    icon: Megaphone,
    roles: ["STAFF"],
  },
  {
    title: "Students",
    url: "/students",
    icon: Users,
    roles: ["STAFF"],
  },
  {
    title: "Timetable",
    url: "/timetable",
    icon: CalendarDays,
    roles: ["STAFF"],
  },
  {
    title: "Library",
    url: "/library",
    icon: Library,
    roles: ["STAFF"],
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
];
