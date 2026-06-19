import { useState } from "react";
import { Link } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Search, Moon, Sun, Monitor, Bell, Megaphone, Pin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/src/components/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MOCK_ANNOUNCEMENTS } from "@/src/pages/announcements/AnnouncementsList";
import { format } from "date-fns";
import { SearchDialog } from "../SearchDialog";

export function TopBar() {
  const { setTheme } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const activeAnnouncements = MOCK_ANNOUNCEMENTS.filter(
    (a) => a.status === "ACTIVE"
  ).sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 dark:border-white/10 bg-white dark:bg-surface-indigo px-8 md:px-8">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-full max-w-md hidden md:block">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="h-5 w-5" />
          </span>
          <Input
            placeholder="Search students, classes, records..."
            className="block w-full rounded-md border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-surface-raised dark:text-white py-2 pl-10 pr-3 text-sm placeholder-slate-400 focus:border-aubergine-500 focus:outline-none focus:ring-1 focus:ring-aubergine-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            aria-label="Open search"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>
          <SidebarTrigger className="bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-surface-raised dark:text-slate-300" aria-label="Toggle sidebar navigation" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-raised rounded-full transition-colors"
                aria-label="Toggle theme between light and dark mode"
              />
            }
            nativeButton={true}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="mr-2 h-4 w-4" />
              <span>Light</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="mr-2 h-4 w-4" />
              <span>Dark</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Monitor className="mr-2 h-4 w-4" />
              <span>System</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notification Bell */}
        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="relative h-10 w-10 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-raised rounded-full transition-colors hidden sm:flex"
                aria-label={`View ${activeAnnouncements.length} announcements`}
              />
            }
            nativeButton={true}
          >
            <Bell className="h-5 w-5" />
            {activeAnnouncements.length > 0 && (
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-80 p-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-aubergine-500" />
                <span className="font-semibold text-sm text-slate-900 dark:text-white">
                  Announcements
                </span>
                {activeAnnouncements.length > 0 && (
                  <Badge className="h-4 px-1.5 text-[10px] bg-aubergine-600 text-white border-none">
                    {activeAnnouncements.length}
                  </Badge>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-white/10">
              {activeAnnouncements.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  No announcements
                </div>
              ) : (
                activeAnnouncements.map((ann) => (
                  <Link
                    key={ann.id}
                    to={`/announcements/${ann.id}`}
                    onClick={() => setNotifOpen(false)}
                    className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-50 dark:hover:bg-surface-raised transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1 flex-1">
                        {ann.title}
                      </span>
                      {ann.pinned && (
                        <Pin className="h-3 w-3 text-aubergine-500 fill-current flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {ann.body}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      {format(new Date(ann.createdAt), "MMM d, yyyy")} ·{" "}
                      {ann.createdByName}
                    </span>
                  </Link>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 dark:border-white/10 px-4 py-2">
              <Link
                to="/announcements"
                onClick={() => setNotifOpen(false)}
                className="text-xs text-aubergine-600 hover:text-aubergine-700 font-medium"
              >
                View all announcements →
              </Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Search Dialog */}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
