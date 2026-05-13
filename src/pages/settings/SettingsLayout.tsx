import React from 'react';
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { Building2, Palette, Settings as SettingsIcon, Shield, ChevronRight, DatabaseBackup } from 'lucide-react';
import { usePermissions } from '../../lib/permissions';

export default function SettingsLayout() {
  const location = useLocation();
  const { isAdmin } = usePermissions();

  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  const navItems = [
    { name: 'School Profile', path: '/settings/school', icon: Building2 },
    { name: 'Branding', path: '/settings/branding', icon: Palette },
    { name: 'System Settings', path: '/settings/system', icon: SettingsIcon },
    { name: 'Roles & Permissions', path: '/settings/roles', icon: Shield },
    { name: 'Backup & Restore', path: '/settings/backup', icon: DatabaseBackup },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Manage school profile, branding, and system configurations.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 shrink-0">
          <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-orange-100 text-orange-900 dark:bg-orange-900/30 dark:text-orange-300'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400'}`} />
                    {item.name}
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 hidden md:block opacity-50" />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex-1">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-[500px]">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
