import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { Outlet, useLocation, Navigate } from "react-router";
import { motion } from "motion/react";
import { useAuth } from "../../providers/AuthProvider";
import ChatWidget from "../chat/ChatWidget";
import AIAssistantWidget from "../ai/AIAssistantWidget";
import { ChatProvider } from "../../providers/ChatProvider";
import { SocialProvider } from "../../providers/SocialProvider";
import { FloatingPanelProvider } from "../../providers/FloatingPanelProvider";

export function AppLayout() {
  const location = useLocation();
  const { user } = useAuth();

  // Force a password change before any app page is reachable.
  if (user?.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return (
    <ChatProvider>
    <SocialProvider>
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background font-sans text-foreground overflow-hidden">
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
          <main id="main-content" className="academic-workspace min-w-0 flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar" tabIndex={-1}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full min-w-0 max-w-full p-4 sm:p-6 lg:p-8"
            >
              <Outlet />
            </motion.div>
          </main>
        </SidebarInset>
        <FloatingPanelProvider>
          <ChatWidget />
          <AIAssistantWidget />
        </FloatingPanelProvider>
      </div>
    </SidebarProvider>
    </SocialProvider>
    </ChatProvider>
  );
}
