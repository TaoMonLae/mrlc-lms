import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { Outlet } from "react-router-dom";
import { motion } from "motion/react";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex flex-col overflow-hidden bg-transparent">
          <TopBar />
          <main className="flex-1 overflow-y-auto custom-scrollbar">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
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
