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
import { Link, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from "@/components/ui/dropdown-menu";
import { usePermissions, useUser } from "@/src/lib/permissions";
import { useSettings } from "@/src/providers/SettingsProvider";

export function AppSidebar() {
  const location = useLocation();
  const { user } = useUser();
  const { isAdmin, isTeacher, isStudent, hasPermission } = usePermissions();
  const { schoolProfile, brandingSettings } = useSettings();

  const filteredNavItems = NAVIGATION_ITEMS.filter(item => {
    if (!user) return false;
    if (!item.roles) return true; // Show to everyone if no roles defined
    return item.roles.includes(user.role);
  });

  return (
    <Sidebar collapsible="icon" className="bg-[#1e293b] text-slate-300 border-r border-slate-700">
      <SidebarHeader className="h-16 flex items-center px-6 border-b border-slate-700">
        <div className="flex items-center gap-3 font-semibold">
          {brandingSettings.logoUrl ? (
            <img src={brandingSettings.logoUrl} alt={schoolProfile.shortName} className="h-8 w-8 object-contain" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white font-bold text-lg" style={{ backgroundColor: brandingSettings.primaryColor }}>
              {schoolProfile.name.charAt(0)}
            </div>
          )}
          <div className="flex flex-col gap-0.5 leading-tight transition-all duration-300 group-data-[collapsible=icon]:opacity-0">
            <span className="text-[10px] font-bold text-white tracking-tight uppercase leading-none overflow-hidden text-ellipsis whitespace-nowrap max-w-[140px]">{schoolProfile.name}</span>
            <span className="text-[10px] font-bold text-slate-400 tracking-tight uppercase leading-none">{schoolProfile.shortName}</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:opacity-0 text-slate-500 text-[10px] uppercase font-bold tracking-widest px-3 mb-2">Main Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {filteredNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link to={item.url} />}
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                    className="h-9 hover:bg-slate-800 hover:text-white data-[active=true]:bg-slate-800 data-[active=true]:text-white transition-colors duration-200"
                  >
                    <item.icon className="h-4 w-4 opacity-70" />
                    <span className="text-sm font-medium">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-slate-700">
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" className="h-12 w-full justify-start gap-3 px-2 hover:bg-slate-800 transition-all duration-200" />} nativeButton={true}>
              <Avatar className="h-9 w-9 rounded-full border border-slate-500 bg-slate-500">
                <AvatarFallback className="bg-slate-500 text-white">
                  {user?.name?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 text-left leading-none group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-semibold text-white truncate">{user?.name || 'User'}</span>
                <span className="text-xs text-slate-400 truncate">{user?.role || 'Guest'}</span>
              </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" side="right" sideOffset={10}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link to="/settings" className="w-full flex items-center" />}>
                <User className="mr-2 h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
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
