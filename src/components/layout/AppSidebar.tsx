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
  SidebarFooter,
  SidebarRail
} from "@/components/ui/sidebar";
import { NAVIGATION_ITEMS } from "@/src/lib/navigation";
import { GraduationCap, LogOut, User } from "lucide-react";
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
              {filteredNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link to={item.url} />}
                    isActive={location.pathname === item.url}
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
              ))}
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
