import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { Outlet, useLocation, Navigate } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import { useAuth } from "../../providers/AuthProvider";
import ChatWidget from "../chat/ChatWidget";
import AIAssistantWidget from "../ai/AIAssistantWidget";
import { ChatProvider } from "../../providers/ChatProvider";
import { SocialProvider } from "../../providers/SocialProvider";
import { FloatingPanelProvider } from "../../providers/FloatingPanelProvider";

export function AppLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();

  // Force a password change before any app page is reachable.
  if (user?.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return (
    <ChatProvider>
    <SocialProvider>
    <SidebarProvider>
      <div className="mrlc-app-shell flex h-screen w-full overflow-hidden bg-background font-sans text-foreground">
        {/* Skip navigation link for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 rounded-sm bg-academic-gold px-4 py-2 text-sm font-semibold text-academic-navy-deep"
        >
          Skip to main content
        </a>
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-col overflow-hidden bg-background">
          <TopBar />
          <main id="main-content" className="academic-workspace min-w-0 flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar" tabIndex={-1}>
            <motion.div
              key={location.pathname}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.14, ease: "easeOut" }}
              className="mx-auto w-full min-w-0 max-w-[1680px] p-4 sm:p-6 xl:p-8"
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
