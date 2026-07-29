import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Languages, LogOut, Settings2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/src/providers/AuthProvider';
import { MrlcQuestBrand, TaoMonLaeCredit } from './MrlcQuestBrand';

export function LanguageQuestShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === 'ADMIN' || user?.role === 'TEACHER';

  const signOut = () => {
    logout();
    navigate('/language-quest');
  };

  return (
    <div className="lq-mesh flex min-h-screen flex-col dark:bg-canvas">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 shadow-sm shadow-violet-900/5 backdrop-blur-xl dark:border-surface-raised dark:bg-canvas/90">
        <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:px-6">
          <MrlcQuestBrand to="/games/language-quest" compact />
          <nav className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="hidden font-bold text-violet-700 sm:flex" render={<Link to="/games/language-quest/leaderboard" />} nativeButton={false}>
              <Trophy className="mr-2 h-4 w-4" /> Leaderboard
            </Button>
            <Button variant="ghost" size="icon" className="text-amber-600 sm:hidden" aria-label="Leaderboard" render={<Link to="/games/language-quest/leaderboard" />} nativeButton={false}>
              <Trophy className="h-4 w-4" />
            </Button>
            {canManage && (
              <Button variant="ghost" size="sm" className="hidden sm:flex" render={<Link to="/games/language-quest/manage" />} nativeButton={false}>
                <Settings2 className="mr-2 h-4 w-4" /> Manage
              </Button>
            )}
            <span className="hidden max-w-40 truncate px-2 text-sm font-semibold text-slate-600 md:block dark:text-slate-300">{user?.name}</span>
            <Button variant="ghost" size="icon" className="rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600" onClick={signOut} aria-label="Sign out"><LogOut className="h-4 w-4" /></Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>
      <footer className="border-t border-white/70 bg-white/65 px-4 py-6 backdrop-blur dark:border-surface-raised dark:bg-canvas/75">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400"><Languages className="h-4 w-4 text-violet-600" /> Learn • Practise • Grow</div>
          <TaoMonLaeCredit />
        </div>
      </footer>
    </div>
  );
}
