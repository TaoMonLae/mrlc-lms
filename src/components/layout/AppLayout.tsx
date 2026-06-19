import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import { motion } from "motion/react";
import { useAuth } from "../../providers/AuthProvider";

export function AppLayout() {
  const location = useLocation();
  const { user } = useAuth();

  // Force a password change before any app page is reachable.
  if (user?.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-slate-50 dark:bg-canvas font-sans text-slate-900 dark:text-white overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-col overflow-hidden bg-transparent">
          <TopBar />
          <main className="min-w-0 flex-1 overflow-y-auto custom-scrollbar">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="p-8"
            >
              <Outlet />
            </motion.div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
