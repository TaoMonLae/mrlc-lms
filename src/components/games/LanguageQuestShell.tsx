import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Languages, LogOut, Moon, Settings2, Sun, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/src/providers/AuthProvider';
import { useTheme } from '@/src/components/theme-provider';
import { MrlcQuestBrand, TaoMonLaeCredit } from './MrlcQuestBrand';
import {
  LanguageQuestExplanationToggle,
  LanguageQuestSupportProvider,
} from './LanguageQuestSupport';

export function LanguageQuestShell() {
  return (
    <LanguageQuestSupportProvider>
      <LanguageQuestShellContent />
    </LanguageQuestSupportProvider>
  );
}

function LanguageQuestShellContent() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [systemDark, setSystemDark] = useState(false);
  const canManage = user?.role === 'ADMIN' || user?.role === 'TEACHER';
  const darkMode = theme === 'dark' || (theme === 'system' && systemDark);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => setSystemDark(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const signOut = () => {
    logout();
    navigate('/language-quest');
  };

  return (
    <div className="lq-mesh flex min-h-screen flex-col text-slate-900 transition-colors duration-300 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 shadow-sm shadow-violet-900/5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:px-6">
          <MrlcQuestBrand to="/games/language-quest" compact />
          <nav className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="hidden font-bold text-violet-700 sm:flex" render={<Link to="/games/language-quest/leaderboard" />} nativeButton={false}>
              <Trophy className="mr-2 h-4 w-4" /> Leaderboard
            </Button>
            <Button variant="ghost" size="icon" className="hidden text-amber-600 min-[460px]:inline-flex sm:hidden" aria-label="Leaderboard" render={<Link to="/games/language-quest/leaderboard" />} nativeButton={false}>
              <Trophy className="h-4 w-4" />
            </Button>
            {canManage && (
              <Button variant="ghost" size="sm" className="hidden sm:flex" render={<Link to="/games/language-quest/manage" />} nativeButton={false}>
                <Settings2 className="mr-2 h-4 w-4" /> Manage
              </Button>
            )}
            <span className="hidden max-w-40 truncate px-2 text-sm font-semibold text-slate-600 md:block dark:text-slate-300">{user?.name}</span>
            <LanguageQuestExplanationToggle />
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-violet-50 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-slate-800"
              onClick={() => setTheme(darkMode ? 'light' : 'dark')}
              aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
              title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600" onClick={signOut} aria-label="Sign out"><LogOut className="h-4 w-4" /></Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>
      <footer className="border-t border-white/70 bg-white/65 px-4 py-6 backdrop-blur dark:border-slate-800 dark:bg-slate-950/75">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400"><Languages className="h-4 w-4 text-violet-600" /> Learn • Practise • Grow</div>
          <TaoMonLaeCredit />
        </div>
      </footer>
    </div>
  );
}
