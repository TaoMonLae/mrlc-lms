import { 
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
  SidebarRail,
  useSidebar
} from "@/components/ui/sidebar";
import { NAVIGATION_ITEMS, ADMIN_NAV, isNavGroup } from "@/src/lib/navigation";
import { GraduationCap, LogOut, User, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from "@/components/ui/dropdown-menu";
import { usePermissions, useUser } from "@/src/lib/permissions";
import { useSettings } from "@/src/providers/SettingsProvider";
import { useAuth } from "@/src/providers/AuthProvider";
import { useChat } from "@/src/providers/ChatProvider";
import { ProfilePhotoUploader } from "@/src/components/profile/ProfilePhotoUploader";

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const { logout } = useAuth();
  const { isAdmin, isTeacher, isStudent, hasPermission } = usePermissions();
  const { schoolProfile, brandingSettings } = useSettings();
  const { unreadCount } = useChat();
  const { isMobile, setOpenMobile, state: sidebarState } = useSidebar();
  const closeOnMobile = () => { if (isMobile) setOpenMobile(false); };

  const isPathActive = (url: string) => {
    if (url === '/settings') {
      // Settings has sub-pages that are separate nav items (audit-log, export).
      return location.pathname.startsWith('/settings')
        && !location.pathname.startsWith('/settings/audit-log')
        && !location.pathname.startsWith('/settings/export');
    }
    return location.pathname === url || location.pathname.startsWith(url + '/');
  };

  // Admin nav groups: open the group containing the current page by default;
  // remember manual open/close choices for the session.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(sessionStorage.getItem('nav_open_groups') || '{}'); } catch { return {}; }
  });
  const toggleGroup = (label: string, fallbackOpen: boolean) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [label]: !(prev[label] ?? fallbackOpen) };
      try { sessionStorage.setItem('nav_open_groups', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNavItems = NAVIGATION_ITEMS.filter(item => {
    if (!user) return false;
    if (!item.roles) return true; // Show to everyone if no roles defined
    return item.roles.includes(user.role);
  });

  return (
    <Sidebar collapsible="icon" className="bg-canvas text-white/80 border-r border-white/10 [&>[data-slot=sidebar-inner]]:bg-canvas [&>[data-slot=sidebar-inner]]:text-white/80" aria-label="Main application navigation">
      <SidebarHeader className="h-16 flex items-center px-6 border-b border-white/10 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
        <div className="flex items-center gap-3 font-semibold group-data-[collapsible=icon]:gap-0">
          {brandingSettings.logoUrl ? (
            <img src={brandingSettings.logoUrl} alt={schoolProfile.shortName} className="h-8 w-8 object-contain shrink-0" />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white font-bold text-lg" style={{ backgroundColor: brandingSettings.primaryColor }}>
              {schoolProfile.name.charAt(0)}
            </div>
          )}
          <div className="flex flex-col gap-0.5 leading-tight transition-all duration-300 overflow-hidden group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0">
            <span className="text-[10px] font-bold text-white tracking-tight uppercase leading-tight line-clamp-2 max-w-[150px]">{schoolProfile.name}</span>
            <span className="text-[10px] font-bold text-white/55 tracking-tight uppercase leading-none">{schoolProfile.shortName}</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 py-4 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:items-center">
        <SidebarGroup className="group-data-[collapsible=icon]:p-0">
          <SidebarGroupLabel className="group-data-[collapsible=icon]:opacity-0 text-white/50 text-[10px] uppercase font-bold tracking-widest px-3 mb-2">Main Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {isAdmin && (sidebarState === 'expanded' || isMobile) ? (
                // ── Grouped admin navigation ─────────────────────────────
                ADMIN_NAV.map((entry) => {
                  if (!isNavGroup(entry)) {
                    return (
                      <SidebarMenuItem key={entry.title}>
                        <SidebarMenuButton
                          render={<Link to={entry.url} onClick={closeOnMobile} />}
                          isActive={isPathActive(entry.url)}
                          tooltip={entry.title}
                          className="h-9 hover:bg-white/10 hover:text-white data-[active=true]:bg-aubergine-600 data-[active=true]:text-white transition-colors duration-200"
                        >
                          <entry.icon className="h-4 w-4 opacity-70" />
                          <span className="text-sm font-medium">{entry.title}</span>
                          {entry.url === '/chat' && unreadCount > 0 && (
                            <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }
                  const containsActive = entry.items.some((i) => isPathActive(i.url));
                  const open = openGroups[entry.label] ?? containsActive;
                  return (
                    <SidebarMenuItem key={entry.label}>
                      <SidebarMenuButton
                        onClick={() => toggleGroup(entry.label, containsActive)}
                        className="h-9 hover:bg-white/10 hover:text-white transition-colors duration-200"
                        aria-expanded={open}
                      >
                        <entry.icon className="h-4 w-4 opacity-70" />
                        <span className="text-sm font-medium">{entry.label}</span>
                        <ChevronDown className={`ml-auto h-4 w-4 opacity-60 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
                      </SidebarMenuButton>
                      {open && (
                        <SidebarMenuSub className="border-white/15 mx-0 ml-5 pl-2.5 pr-0">
                          {entry.items.map((item) => (
                            <SidebarMenuSubItem key={item.url + item.title}>
                              <SidebarMenuSubButton
                                render={<Link to={item.url} onClick={closeOnMobile} />}
                                isActive={isPathActive(item.url)}
                                className="h-8 text-white/70 hover:bg-white/10 hover:text-white data-active:bg-aubergine-600 data-active:text-white data-[active=true]:bg-aubergine-600 data-[active=true]:text-white [&_svg]:text-white/50"
                              >
                                <item.icon className="h-3.5 w-3.5" />
                                <span className="text-sm font-medium">{item.title}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  );
                })
              ) : (
                // ── Flat navigation (teacher/student/staff, or icon-collapsed admin) ──
                (isAdmin
                  ? ADMIN_NAV.flatMap((e) => (isNavGroup(e) ? e.items : [e]))
                  : filteredNavItems
                ).map((item) => (
                  <SidebarMenuItem key={item.url + item.title}>
                    <SidebarMenuButton
                      render={<Link to={item.url} onClick={closeOnMobile} />}
                      isActive={isPathActive(item.url)}
                      tooltip={item.title}
                      className="h-9 hover:bg-white/10 hover:text-white data-[active=true]:bg-aubergine-600 data-[active=true]:text-white transition-colors duration-200"
                    >
                      <item.icon className="h-4 w-4 opacity-70" />
                      <span className="text-sm font-medium">{item.title}</span>
                      {item.url === '/chat' && unreadCount > 0 && (
                        <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white group-data-[collapsible=icon]:hidden">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-white/10 group-data-[collapsible=icon]:p-2">
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" className="h-12 w-full justify-start gap-3 px-2 hover:bg-white/10 transition-all duration-200 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:gap-0" aria-label="Open user menu" />} nativeButton={true}>
              <Avatar className="h-9 w-9 shrink-0 rounded-full border border-white/20 bg-white/15 group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7">
                <AvatarImage src={user?.profilePhotoUrl || undefined} />
                <AvatarFallback className="bg-white/15 text-white">
                  {user?.name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 text-left leading-none group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-semibold text-white truncate">{user?.name || 'User'}</span>
                <span className="text-xs text-white/55 truncate">{user?.role || 'Guest'}</span>
              </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" side="right" sideOffset={10}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <div className="px-2 py-3">
                <ProfilePhotoUploader
                  currentUrl={user?.profilePhotoUrl}
                  fallbackText={user?.name?.split(' ').map(w => w[0]).join('') || 'U'}
                  targetType="user"
                  imageClassName="h-16 w-16 rounded-full"
                  buttonLabel="Change Picture"
                  onUploaded={() => window.location.reload()}
                />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link to="/settings" className="w-full flex items-center" />}>
                <User className="mr-2 h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              id="logout-btn"
              className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
              onClick={handleLogout}
              aria-label="Log out of application"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
