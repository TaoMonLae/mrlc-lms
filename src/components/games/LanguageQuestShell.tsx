import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, Brain, GraduationCap, Info, Languages, LogOut, Moon, Settings2, Sun, Trophy, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/src/providers/AuthProvider';
import { useTheme } from '@/src/components/theme-provider';
import { MrlcQuestBrand, TaoMonLaeCredit } from './MrlcQuestBrand';
import {
  LanguageQuestExplanationToggle,
  LanguageQuestSupportProvider,
} from './LanguageQuestSupport';
import { LanguageQuestDictionary } from './LanguageQuestDictionary';
import { LanguageQuestAvatar } from './LanguageQuestAvatar';
import { LanguageQuestPreferencesProvider } from './LanguageQuestPreferences';

export function LanguageQuestShell() {
  return (
    <LanguageQuestPreferencesProvider>
      <LanguageQuestSupportProvider>
        <LanguageQuestShellContent />
      </LanguageQuestSupportProvider>
    </LanguageQuestPreferencesProvider>
  );
}

function LanguageQuestShellContent() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [systemDark, setSystemDark] = useState(false);
  const canManage = user?.role === 'ADMIN' || user?.role === 'TEACHER';
  const isAdmin = user?.role === 'ADMIN';
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
            <Button variant="ghost" size="icon" className="hidden text-fuchsia-600 min-[520px]:inline-flex" aria-label="Mastery reviews" title="Mastery reviews" render={<Link to="/games/language-quest/mastery" />} nativeButton={false}>
              <Brain className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="hidden font-bold text-violet-700 sm:flex" render={<Link to="/games/language-quest/leaderboard" />} nativeButton={false}>
              <Trophy className="mr-2 h-4 w-4" /> Leaderboard
            </Button>
            <Button variant="ghost" size="icon" className="hidden text-amber-600 min-[460px]:inline-flex sm:hidden" aria-label="Leaderboard" render={<Link to="/games/language-quest/leaderboard" />} nativeButton={false}>
              <Trophy className="h-4 w-4" />
            </Button>
            {canManage && (
              <Button variant="ghost" size="sm" className="hidden xl:flex" render={<Link to="/games/language-quest/manage" />} nativeButton={false}>
                <Settings2 className="mr-2 h-4 w-4" /> Manage
              </Button>
            )}
            {canManage && (
              <>
                <Button variant="ghost" size="sm" className="hidden xl:flex" render={<Link to="/games/language-quest/analytics" />} nativeButton={false}>
                  <BarChart3 className="mr-2 h-4 w-4" /> Analytics
                </Button>
                <Button variant="ghost" size="icon" className="hidden text-fuchsia-600 min-[680px]:inline-flex xl:hidden" aria-label="Learning analytics" render={<Link to="/games/language-quest/analytics" />} nativeButton={false}>
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </>
            )}
            {canManage && (
              <>
                <Button variant="ghost" size="sm" className="hidden xl:flex" render={<Link to="/games/language-quest/classrooms" />} nativeButton={false}>
                  <GraduationCap className="mr-2 h-4 w-4" /> Classrooms
                </Button>
                <Button variant="ghost" size="icon" className="hidden text-sky-600 min-[560px]:inline-flex xl:hidden" aria-label="Classrooms" render={<Link to="/games/language-quest/classrooms" />} nativeButton={false}>
                  <GraduationCap className="h-4 w-4" />
                </Button>
              </>
            )}
            {isAdmin && (
              <>
                <Button variant="ghost" size="sm" className="hidden xl:flex" render={<Link to="/games/language-quest/learners" />} nativeButton={false}>
                  <Users className="mr-2 h-4 w-4" /> Learners
                </Button>
                <Button variant="ghost" size="icon" className="hidden text-emerald-600 min-[620px]:inline-flex xl:hidden" aria-label="Manage learners" render={<Link to="/games/language-quest/learners" />} nativeButton={false}>
                  <Users className="h-4 w-4" />
                </Button>
              </>
            )}
            <span className="hidden max-w-40 truncate px-2 text-sm font-semibold text-slate-600 md:block dark:text-slate-300">{user?.name}</span>
            <Link
              to="/games/language-quest/profile"
              className="rounded-2xl outline-none ring-offset-2 transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-violet-500"
              aria-label="Learner profile"
              title="Learner profile"
            >
              <LanguageQuestAvatar avatarId={user?.languageQuestAvatar} name={user?.name} className="h-9 w-9 text-lg shadow-sm" />
            </Link>
            <LanguageQuestDictionary />
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
            <Button variant="ghost" size="icon" className="rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400" onClick={signOut} aria-label="Sign out"><LogOut className="h-4 w-4" /></Button>
          </nav>
        </div>
      </header>
      <main data-lq-dictionary-scope className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>
      <footer className="border-t border-white/70 bg-white/65 px-4 py-6 backdrop-blur dark:border-slate-800 dark:bg-slate-950/75">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400"><Languages className="h-4 w-4 text-violet-600" /> Learn • Practise • Grow</div>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
            <Link to="/language-quest/about" className="inline-flex items-center gap-1.5 text-xs font-black text-violet-700 underline-offset-4 hover:underline dark:text-violet-300">
              <Info className="h-3.5 w-3.5" /> About &amp; course sources
            </Link>
            <TaoMonLaeCredit />
          </div>
        </div>
      </footer>
    </div>
  );
}
