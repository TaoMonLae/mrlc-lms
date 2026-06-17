import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Menu, X, ChevronRight, LayoutDashboard, Users, BookOpen, 
  Calendar, FileCheck, Wallet, Shield, AlertCircle, Database, 
  Moon, Sun, CheckCircle2, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '../components/theme-provider';
import { useUser } from '../lib/permissions';

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useUser();
  const navigate = useNavigate();

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'Roles', href: '#roles' },
    { name: 'Workflow', href: '#workflow' },
    { name: 'About', href: '#about' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-canvas font-sans selection:bg-aubergine-200 dark:selection:bg-aubergine-900 transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-surface-raised bg-white/80 dark:bg-canvas/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-aubergine-600 flex items-center justify-center text-white font-black text-xl italic tracking-tighter">
              M
            </div>
            <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white uppercase italic">
              MRLC LMS
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex flex-1 items-center justify-center gap-8">
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href}
                className="text-sm font-bold uppercase tracking-widest text-slate-600 hover:text-aubergine-600 dark:text-slate-300 dark:hover:text-aubergine-500 transition-colors"
              >
                {link.name}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            {user ? (
              <Button render={<Link to="/dashboard" />} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-widest px-6 h-10 shadow-lg shadow-aubergine-600/20" nativeButton={false}>
                Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button render={<Link to="/login" />} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-widest px-6 h-10 shadow-lg shadow-aubergine-600/20" nativeButton={false}>
                Login
              </Button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas px-4 py-6 space-y-4 shadow-xl">
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-sm font-bold uppercase tracking-widest text-slate-600 hover:text-aubergine-600 dark:text-slate-300 dark:hover:text-aubergine-500"
              >
                {link.name}
              </a>
            ))}
            <div className="pt-4 border-t border-slate-100 dark:border-surface-raised">
              {user ? (
                <Button render={<Link to="/dashboard" />} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-widest h-11" nativeButton={false}>
                  Dashboard
                </Button>
              ) : (
                <Button render={<Link to="/login" />} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-widest h-11" nativeButton={false}>
                  Login
                </Button>
              )}
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-20 pb-24 md:pt-32 md:pb-32 overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <Badge variant="outline" className="px-4 py-1.5 border-aubergine-200 bg-aubergine-50 text-aubergine-700 dark:border-aubergine-900/50 dark:bg-aubergine-900/20 dark:text-aubergine-400 font-bold tracking-widest text-[10px] uppercase">
                Purpose-Built for One School
              </Badge>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold text-slate-900 dark:text-white tracking-[-0.02em] leading-[1.04]">
                Simple school management for <span className="text-aubergine-600">MRLC GED School</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 font-normal leading-relaxed max-w-2xl mx-auto">
                Manage students, classes, attendance, exams, reports, and learning resources in one secure system. Designed exclusively for refugee learners in Malaysia.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                {user ? (
                  <Button render={<Link to="/dashboard" />} size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-widest h-12 px-8 shadow-xl shadow-aubergine-600/20" nativeButton={false}>
                    Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button render={<Link to="/login" />} size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-widest h-12 px-8 shadow-xl shadow-aubergine-600/20" nativeButton={false}>
                    Login to Dashboard <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
                <Button render={<a href="#features" />} variant="outline" size="lg" className="w-full sm:w-auto border-slate-200 dark:border-surface-raised bg-white/50 dark:bg-canvas/50 hover:bg-slate-100 dark:hover:bg-surface-indigo font-bold text-xs uppercase tracking-widest h-12 px-8 backdrop-blur-sm" nativeButton={false}>
                  View Features
                </Button>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="mt-20 max-w-5xl mx-auto">
              <div className="relative rounded-2xl border border-slate-200/50 dark:border-surface-raised/50 bg-white/40 dark:bg-canvas/40 backdrop-blur-xl p-2 shadow-2xl overflow-hidden ring-1 ring-slate-900/5 dark:ring-white/5">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-100/20 to-transparent dark:from-slate-800/20 block" />
                <img 
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2000&h=1000" 
                  alt="Dashboard Preview" 
                  className="rounded-xl shadow-sm border border-slate-100 dark:border-surface-raised saturate-[0.85] opacity-90 object-cover w-full h-[500px]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent dark:from-slate-950 max-h-[500px]" />
                
                {/* Overlay Dashboard Widgets */}
                <div className="absolute bottom-6 left-6 right-6 hidden md:grid grid-cols-4 gap-4">
                  {[
                    { icon: Users, label: "Students", value: "245", color: "text-blue-600" },
                    { icon: BookOpen, label: "Classes", value: "12", color: "text-emerald-600" },
                    { icon: Calendar, label: "Attendance", value: "98%", color: "text-amber-600" },
                    { icon: FileCheck, label: "Exams", value: "8+", color: "text-purple-600" }
                  ].map((stat, i) => (
                    <Card key={i} className="bg-white/95 dark:bg-canvas/95 backdrop-blur-md border-none shadow-xl">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-lg bg-slate-100 dark:bg-surface-indigo flex items-center justify-center ${stat.color}`}>
                          <stat.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{stat.label}</p>
                          <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{stat.value}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Background Decorative Blobs */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-aubergine-400/20 dark:bg-aubergine-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />
        </section>

        {/* Feature Overview Section */}
        <section id="features" className="py-24 bg-white dark:bg-surface-indigo/50 border-y border-slate-100 dark:border-surface-raised/50">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Comprehensive Modules</h2>
              <p className="text-slate-600 dark:text-slate-300 font-medium italic mt-4">Everything needed to run MRLC smoothly, neatly compartmentalized and easy to use.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Users, title: "Student Management", desc: "Digital profiles, family contact details, and progress tracking." },
                { icon: LayoutDashboard, title: "Teacher Portal", desc: "Dedicated workspace for lesson planning and grading." },
                { icon: BookOpen, title: "Class Management", desc: "Organize Pre-GED and GED streams, schedules, and subjects." },
                { icon: Calendar, title: "Attendance Tracking", desc: "Daily logs, automated reporting, and truancy alerts." },
                { icon: FileCheck, title: "GED Exam Builder", desc: "Create, schedule, and grade mock exams and assignments." },
                { icon: CheckCircle2, title: "Results & Reports", desc: "Generate professional report cards and performance analytics." },
                { icon: Database, title: "Library Resources", desc: "Centralized catalog for physical and digital study materials." },
                { icon: Wallet, title: "Fees & Receipts", desc: "Track contributions, generate receipts, and monitor balances." },
                { icon: AlertCircle, title: "Case Management", desc: "Secure, restricted-access logging for pastoral & disciplinary issues." },
                { icon: Shield, title: "School Settings", desc: "Centralized control for academic years, branding, and permissions." },
              ].map((feature, i) => (
                <Card key={i} className="group border-slate-200 dark:border-surface-raised hover:shadow-lg transition-all hover:border-aubergine-200 dark:hover:border-aubergine-900/50 bg-slate-50/50 dark:bg-surface-indigo/20">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-xl bg-aubergine-100 dark:bg-aubergine-900/30 flex items-center justify-center text-aubergine-600 group-hover:scale-110 transition-transform duration-300 mb-4">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-sm font-bold uppercase tracking-tight">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-xs font-medium italic leading-relaxed text-slate-600 dark:text-slate-300">
                      {feature.desc}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Role-Based Access Section */}
        <section id="roles" className="py-24">
          <div className="container mx-auto px-4">
             <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Tailored Experiences</h2>
              <p className="text-slate-600 dark:text-slate-300 font-medium italic mt-4">Three distinct views to ensure everyone has exactly what they need—and nothing they don't.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Admin — purple */}
              <div className="p-8 rounded-md bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised border-t-4 border-t-accent-purple space-y-6">
                <div className="h-14 w-14 rounded-md bg-accent-purple/10 text-accent-purple flex items-center justify-center">
                  <Shield className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold tracking-[-0.01em] text-slate-900 dark:text-white mb-2">Administrators</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">Complete oversight and control over school operations.</p>
                  <ul className="space-y-3">
                    {["Manage school data & settings", "Control user accounts & roles", "View school-wide reports", "Access private case management", "System backups & audit logs"].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="h-4 w-4 text-accent-purple shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Teacher — blue */}
              <div className="p-8 rounded-md bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised border-t-4 border-t-accent-blue space-y-6 relative overflow-hidden ring-1 ring-accent-blue/20">
                <div className="absolute top-0 right-0 bg-accent-blue text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-md">Core User</div>
                <div className="h-14 w-14 rounded-md bg-accent-blue/10 text-accent-blue flex items-center justify-center">
                  <Users className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold tracking-[-0.01em] text-slate-900 dark:text-white mb-2">Teachers</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">Focused tools to manage classes and evaluate student progress.</p>
                  <ul className="space-y-3">
                    {["Manage assigned classes", "Record daily attendance", "Create & grade exams", "Share library resources", "Generate class reports"].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="h-4 w-4 text-accent-blue shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Student — green */}
              <div className="p-8 rounded-md bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised border-t-4 border-t-accent-green space-y-6">
                <div className="h-14 w-14 rounded-md bg-accent-green/10 text-accent-green flex items-center justify-center">
                  <BookOpen className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold tracking-[-0.01em] text-slate-900 dark:text-white mb-2">Students &amp; Parents</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">Transparent access to academic history and standing.</p>
                  <ul className="space-y-3">
                    {["View personal profile & timetable", "Check attendance history", "Take online exams & see results", "Access digital study materials", "View fee payment history"].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="h-4 w-4 text-accent-green shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section id="workflow" className="py-24 bg-white dark:bg-surface-indigo/50 border-y border-slate-100 dark:border-surface-raised/50 text-center">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic mb-16">The GED Workflow</h2>
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-2">
              {[
                { step: "1", title: "Registration", icon: Users },
                { step: "2", title: "Assignment", icon: LayoutDashboard },
                { step: "3", title: "Attendance", icon: Calendar },
                { step: "4", title: "Exams", icon: FileCheck },
                { step: "5", title: "Reports", icon: CheckCircle2 }
              ].map((item, i, arr) => (
                <React.Fragment key={i}>
                  <div className="flex flex-col items-center">
                    <div className="h-16 w-16 rounded-full bg-slate-50 dark:bg-surface-raised border-2 border-slate-200 dark:border-surface-raised flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-sm relative">
                      <item.icon className="h-6 w-6" />
                      <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-aubergine-600 text-white flex items-center justify-center text-[10px] font-black border-2 border-white dark:border-slate-900">
                        {item.step}
                      </div>
                    </div>
                    <span className="mt-4 text-[11px] font-bold uppercase tracking-widest text-slate-900 dark:text-white">{item.title}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="h-8 w-px md:h-px md:w-12 bg-slate-300 dark:bg-slate-700 mx-2" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* Why This LMS Section */}
        <section id="about" className="py-24">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Built Specifically for MRLC</h2>
                  <p className="text-slate-600 dark:text-slate-300 font-medium italic mt-4 leading-relaxed">
                    Unlike bloated enterprise software or complex SaaS platforms, this system is designed specifically for the unique needs of a single, focused institution supporting refugee learners.
                  </p>
                </div>
                
                <ul className="space-y-4">
                  {[
                    "Built for one school, no confusing multi-tenant settings.",
                    "Streamlined for Pre-GED and GED class structures.",
                    "Responsive design works flawlessly on mobile phones.",
                    "Keeps historically disjointed school records perfectly organized.",
                    "Automates reports to save teachers and administration time."
                  ].map((point, i) => (
                    <li key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white dark:bg-surface-indigo border border-slate-100 dark:border-surface-raised shadow-sm">
                      <div className="h-6 w-6 rounded-full bg-aubergine-100 dark:bg-aubergine-900/30 text-aubergine-600 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="h-3 w-3" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Security Block */}
              <div className="p-8 md:p-12 rounded-3xl bg-slate-900 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Shield className="w-64 h-64" />
                </div>
                <div className="relative z-10 space-y-6">
                  <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">Security & Privacy First</h3>
                  <p className="text-slate-400 font-medium italic leading-relaxed text-sm">
                    Operating an educational facility requires stringent data protection. MRLC LMS ensures student data remains private and secure.
                  </p>
                  <ul className="space-y-3">
                    {[
                      "Strict Role-Based Access Control (RBAC)",
                      "Secure, encrypted login sessions",
                      "Protected student and refugee records",
                      "Admin-only system settings and exports",
                      "Private, restricted case management logs",
                      "Automated database backup routines"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-200">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section — Webflow near-black editorial closing band */}
        <section className="py-28 bg-[#080808] text-white text-center">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl md:text-6xl font-semibold tracking-[-0.02em] leading-[1.05] max-w-3xl mx-auto mb-6">Ready to manage your school more easily?</h2>
            <p className="text-slate-300 font-normal text-lg mb-10 max-w-xl mx-auto">
              Log in to access the MRLC School LMS dashboard. Secure access is restricted to authorized personnel and enrolled students.
            </p>
            <Button render={<Link to="/login" />} size="lg" className="bg-white text-[#080808] hover:bg-slate-100 font-semibold text-sm h-12 px-7 shadow-xl" nativeButton={false}>
              Login to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 dark:bg-canvas border-t border-slate-200 dark:border-surface-raised py-12">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-50 grayscale">
            <div className="h-6 w-6 rounded border border-slate-400 flex items-center justify-center font-black text-[10px] italic tracking-tighter">
              M
            </div>
            <span className="font-black text-sm tracking-tight uppercase italic">
              MRLC GED School
            </span>
          </div>
          
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            © {new Date().getFullYear()} Built for MRLC GED School
          </p>

          <div className="flex items-center gap-6">
            <Link to="/login" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-aubergine-600 transition-colors">Login</Link>
            <a href="#" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-aubergine-600 transition-colors">Privacy</a>
            <a href="#" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-aubergine-600 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
