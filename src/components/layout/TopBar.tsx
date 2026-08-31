import { useState, useEffect } from "react";
import { Link } from "react-router";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Search, Moon, Sun, Monitor, Bell, Megaphone, Pin, Calendar, Clock, Settings } from "lucide-react";
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
import type { Announcement } from "@/src/pages/announcements/AnnouncementsList";
import { format } from "date-fns";
import { SearchDialog } from "../SearchDialog";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useUser } from "@/src/lib/permissions";
import { apiGet, apiSend } from "@/src/lib/api";
import { useSettings } from "@/src/providers/SettingsProvider";
import { formatSchoolDate, formatSchoolTime, formatSchoolWeekday } from "@/src/lib/dateTime";

type NotificationRow = { id: string; type: string; title: string; message: string; href?: string | null; readAt?: string | null; createdAt: string };

export function TopBar() {
  const { setTheme } = useTheme();
  const { user } = useUser();
  const { systemSettings } = useSettings();
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // Search covers students/teachers/classes — records only these roles may see.
  const canSearch = !!user && ["ADMIN", "TEACHER", "STAFF"].includes(user.role);

  // Ctrl/Cmd+K opens search from anywhere.
  useEffect(() => {
    if (!canSearch) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canSearch]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [viewedAnnouncements, setViewedAnnouncements] = useState<Set<string>>(new Set());
  const viewedAnnouncementsKey = `viewed_announcements:${user?.id || 'anonymous'}`;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Keep read state separate on shared devices so one person's bell does
    // not hide another person's unread announcements.
    setViewedAnnouncements(new Set());
    const storedViewed = localStorage.getItem(viewedAnnouncementsKey);
    if (storedViewed) {
      try {
        setViewedAnnouncements(new Set(JSON.parse(storedViewed)));
      } catch (e) {
        console.error("Failed to parse viewed announcements:", e);
      }
    }
  }, [viewedAnnouncementsKey]);

  // Fetch on mount AND whenever the bell is opened, so announcements published
  // after page load show up without a full refresh.
  useEffect(() => {
    if (!notifOpen && announcements.length > 0) return;
    Promise.all([
      apiGet<any[]>("/api/announcements").catch(() => []),
      apiGet<{ notifications: NotificationRow[] }>("/api/notifications").catch(() => ({ notifications: [] })),
    ]).then(([announcementRows, notificationData]) => {
      setAnnouncements(Array.isArray(announcementRows) ? announcementRows : []);
      setNotifications(notificationData.notifications || []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifOpen]);

  const activeAnnouncements = announcements
    .filter((a) => a.status === "ACTIVE")
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Calculate unread announcements (not viewed)
  const unreadAnnouncements = activeAnnouncements.filter(
    (ann) => !viewedAnnouncements.has(ann.id)
  );
  const unreadNotifications = notifications.filter((notification) => !notification.readAt);
  const unreadCount = unreadAnnouncements.length + unreadNotifications.length;

  // Mark announcement as viewed when clicked
  const markAsViewed = (announcementId: string) => {
    setViewedAnnouncements((prev) => {
      const updated = new Set(prev);
      updated.add(announcementId);
      localStorage.setItem(viewedAnnouncementsKey, JSON.stringify([...updated]));
      return updated;
    });
  };

  // Mark all as viewed
  const markAllAsViewed = async () => {
    const allIds = activeAnnouncements.map((ann) => ann.id);
    setViewedAnnouncements(new Set(allIds));
    localStorage.setItem(viewedAnnouncementsKey, JSON.stringify(allIds));
    setNotifications((rows) => rows.map((row) => ({ ...row, readAt: row.readAt || new Date().toISOString() })));
    await apiSend('/api/notifications/read-all', 'POST').catch(() => undefined);
  };

  const markNotificationRead = async (notificationId: string) => {
    setNotifications((rows) => rows.map((row) => row.id === notificationId ? { ...row, readAt: row.readAt || new Date().toISOString() } : row));
    await apiSend(`/api/notifications/${notificationId}/read`, 'PATCH').catch(() => undefined);
  };

  return (
    <header className="sticky top-0 z-30 flex h-[72px] w-full items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-6 xl:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {canSearch && (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="relative hidden w-full max-w-lg text-left lg:block"
            aria-label="Open search (Ctrl+K)"
          >
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
              <Search className="size-4" />
            </span>
            <span className="block h-10 w-full rounded-sm border border-border bg-background py-2 pl-10 pr-14 text-sm text-muted-foreground transition-colors hover:border-academic-teal">
              Search school records…
            </span>
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm border border-border bg-card px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        )}
        <div className="flex items-center gap-1 lg:hidden">
          {canSearch && (
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-sm"
              aria-label="Open search"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>
          )}
          <SidebarTrigger className="size-10 rounded-sm border border-border bg-card text-foreground hover:bg-muted md:hidden" aria-label="Toggle sidebar navigation" />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {/* Time and Date Display */}
        <div className="hidden h-10 items-center divide-x divide-border border border-border bg-background xl:flex">
          <span className="flex h-full items-center gap-2 px-3 text-xs font-semibold uppercase tracking-[0.055em] text-foreground">
          <Calendar className="size-4 text-academic-teal" />
            {formatSchoolWeekday(currentTime, systemSettings.timezone).toUpperCase()} · {formatSchoolDate(currentTime, systemSettings.timezone, systemSettings.dateFormat)}
          </span>
          <span className="flex h-full items-center gap-2 px-3 font-mono text-xs font-semibold text-foreground">
          <Clock className="size-4 text-academic-teal" />
            {formatSchoolTime(currentTime, systemSettings.timezone, systemSettings.timeFormat, systemSettings.clockShowSeconds)}
          </span>
        </div>

        <LanguageSwitcher />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-10 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
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
                className="relative hidden size-10 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground sm:flex"
                aria-label={`View ${unreadCount} unread notifications`}
              />
            }
            nativeButton={true}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 size-2 rounded-full bg-academic-coral ring-2 ring-card" />
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-80 p-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-aubergine-500" />
                <span className="font-semibold text-sm text-slate-900 dark:text-white">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <Badge className="h-4 px-1.5 text-[10px] bg-aubergine-600 text-white border-none">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsViewed}
                  className="text-xs text-aubergine-600 hover:text-aubergine-700 font-medium"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-white/10">
              {notifications.length === 0 && activeAnnouncements.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  You're all caught up
                </div>
              ) : (
                <>
                {notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    to={notification.href || '#'}
                    onClick={() => { void markNotificationRead(notification.id); setNotifOpen(false); }}
                    className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-50 dark:hover:bg-surface-raised"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{notification.title}</span>
                      {!notification.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-aubergine-500" />}
                    </div>
                    <p className="text-xs leading-relaxed text-slate-500">{notification.message}</p>
                    <span className="text-[10px] text-slate-400">{format(new Date(notification.createdAt), 'MMM d, yyyy')}</span>
                  </Link>
                ))}
                {activeAnnouncements.map((ann) => (
                  <div
                    key={ann.id}
                    onClick={() => markAsViewed(ann.id)}
                    className="cursor-pointer flex flex-col gap-1 px-4 py-3 hover:bg-slate-50 dark:hover:bg-surface-raised transition-colors"
                  >
                    <Link
                      to={`/announcements/${ann.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setNotifOpen(false);
                      }}
                      className="flex flex-col gap-1 w-full"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1 flex-1">
                          {ann.title}
                        </span>
                        {ann.pinned && (
                          <Pin className="h-3 w-3 text-aubergine-500 fill-current flex-shrink-0 mt-0.5" />
                        )}
                        {!viewedAnnouncements.has(ann.id) && (
                          <span className="h-2 w-2 rounded-full bg-aubergine-500 flex-shrink-0 mt-1.5" />
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
                  </div>
                ))}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 dark:border-white/10 px-4 py-2">
              <Link
                to="/profile#notifications"
                onClick={() => setNotifOpen(false)}
                className="text-xs text-aubergine-600 hover:text-aubergine-700 font-medium"
              >
                <Settings className="mr-1 inline h-3 w-3" /> Notification preferences →
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
