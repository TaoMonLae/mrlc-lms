import { useLayoutEffect, useRef } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { Outlet, useLocation, Navigate } from "react-router";
import { useAuth } from "../../providers/AuthProvider";
import ChatWidget from "../chat/ChatWidget";
import { ChatProvider } from "../../providers/ChatProvider";
import { SocialProvider } from "../../providers/SocialProvider";
import { FloatingPanelProvider } from "../../providers/FloatingPanelProvider";

export function AppLayout() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!location.hash && mainRef.current) mainRef.current.scrollTop = 0;
  }, [location.pathname]);
  const { user } = useAuth();
  const takingExam = /^\/exam2\/attempts\/[^/]+\/play\/?$/.test(location.pathname);
  const printingExam = /^\/exam2\/[^/]+\/print\/?$/.test(location.pathname);
  const playingWordConnect = /^\/games\/word-connect\/play\/[^/]+\/?$/.test(location.pathname);

  // Force a password change before any app page is reachable.
  if (user?.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  // Printed exams must stay in the document flow. The normal app shell fixes
  // its height to the viewport and scrolls inside <main>, which clips PDFs.
  if (printingExam) {
    return <main className="min-h-screen bg-background p-4 sm:p-6 print:min-h-0 print:bg-white print:p-0"><Outlet /></main>;
  }

  return (
    <ChatProvider>
    <SocialProvider>
    <SidebarProvider>
      <div className="mrlc-app-shell flex h-dvh w-full overflow-hidden bg-background font-sans text-foreground">
        {/* Skip navigation link for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Skip to main content
        </a>
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-col overflow-hidden bg-background">
          <TopBar />
          <main ref={mainRef} id="main-content" className="academic-workspace min-w-0 flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar" tabIndex={-1}>
            <div
              key={location.pathname}
              className="mx-auto w-full min-w-0 max-w-[1680px] p-4 sm:p-6 xl:p-8"
            >
              <Outlet />
            </div>
          </main>
        </SidebarInset>
        {!takingExam && !playingWordConnect && !/^\/exam2\/grade\//.test(location.pathname) && !/^\/exams\/[^/]+\/(studio|edit)\/?$/.test(location.pathname) && <FloatingPanelProvider>
          <ChatWidget />
        </FloatingPanelProvider>}
      </div>
    </SidebarProvider>
    </SocialProvider>
    </ChatProvider>
  );
}
