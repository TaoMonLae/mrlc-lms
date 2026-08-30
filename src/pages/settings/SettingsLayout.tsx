import { Outlet, useLocation, Navigate } from 'react-router';
import { Activity, Building2, Palette, Settings as SettingsIcon, Shield, DatabaseBackup, Rss, Trash2 } from 'lucide-react';
import FieldbookSettingsFrame from '../../../components/blocks/settings-form-1';
import { usePermissions } from '../../lib/permissions';

const navItems = [
  { label: 'School profile', path: '/settings/school', icon: Building2 },
  { label: 'Branding', path: '/settings/branding', icon: Palette },
  { label: 'System preferences', path: '/settings/system', icon: SettingsIcon },
  { label: 'Roles & permissions', path: '/settings/roles', icon: Shield },
  { label: 'News sources', path: '/settings/news-sources', icon: Rss },
  { label: 'Backup & restore', path: '/settings/backup', icon: DatabaseBackup },
  { label: 'System health', path: '/settings/health', icon: Activity },
  { label: 'Exam record removal', path: '/settings/exam-records', icon: Trash2 },
];

export default function SettingsLayout() {
  const location = useLocation();
  const { isAdmin } = usePermissions();

  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="mx-auto max-w-[1480px] pb-10">
      <FieldbookSettingsFrame activePath={location.pathname} items={navItems}>
        <Outlet />
      </FieldbookSettingsFrame>
    </div>
  );
}
