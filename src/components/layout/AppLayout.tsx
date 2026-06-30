import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import { motion } from "motion/react";
import { useAuth } from "../../providers/AuthProvider";
import ChatWidget from "../chat/ChatWidget";
import { ChatProvider } from "../../providers/ChatProvider";

export function AppLayout() {
  const location = useLocation();
  const { user } = useAuth();

  // Force a password change before any app page is reachable.
  if (user?.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return (
    <ChatProvider>
    <SidebarProvider>
      <div className="flex h-screen w-full bg-slate-50 dark:bg-canvas font-sans text-slate-900 dark:text-white overflow-hidden">
        {/* Skip navigation link for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium text-sm transition-all"
        >
          Skip to main content
        </a>
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-col overflow-hidden bg-transparent">
          <TopBar />
          <main id="main-content" className="min-w-0 flex-1 overflow-y-auto custom-scrollbar" tabIndex={-1}>
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
        <ChatWidget />
      </div>
    </SidebarProvider>
    </ChatProvider>
  );
}
