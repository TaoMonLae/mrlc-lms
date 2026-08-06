import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { BarChart3, BookOpenText, Brain, GraduationCap, Home, Info, Languages, LogOut, Menu, Moon, Settings2, Sun, Trophy, UserRound, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const location = useLocation();
  const [systemDark, setSystemDark] = useState(false);
  const canManage = user?.role === 'ADMIN' || user?.role === 'TEACHER';
  const isAdmin = user?.role === 'ADMIN';
  const classroomsHref = canManage
    ? '/games/language-quest/classrooms'
    : '/games/language-quest/profile#classrooms';
  const darkMode = theme === 'dark' || (theme === 'system' && systemDark);
  const pathIs = (href: string) => location.pathname === href || location.pathname.startsWith(`${href}/`);

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
        <div className="mx-auto flex min-h-18 max-w-[1600px] items-center gap-2 px-3 py-2 sm:px-5">
          <div className="shrink-0"><MrlcQuestBrand to="/games/language-quest" compact /></div>
          <div className="ml-auto flex min-w-0 items-center gap-1">
            <nav aria-label="Language Quest" className="hidden shrink-0 items-center gap-1 lg:flex">
              <Button variant="ghost" size="sm" className={`h-10 gap-2 rounded-xl px-3 font-bold text-sky-700 ${pathIs('/games/language-quest/words') ? 'bg-sky-50 dark:bg-sky-500/10' : ''}`} title="My learned words" render={<Link to="/games/language-quest/words" aria-current={pathIs('/games/language-quest/words') ? 'page' : undefined} />} nativeButton={false}>
                <BookOpenText className="h-4 w-4" /><span className="hidden 2xl:inline">My Words</span>
              </Button>
              <Button variant="ghost" size="sm" className={`h-10 gap-2 rounded-xl px-3 font-bold text-fuchsia-700 ${pathIs('/games/language-quest/mastery') ? 'bg-fuchsia-50 dark:bg-fuchsia-500/10' : ''}`} title="Mastery reviews" render={<Link to="/games/language-quest/mastery" aria-current={pathIs('/games/language-quest/mastery') ? 'page' : undefined} />} nativeButton={false}>
                <Brain className="h-4 w-4" /><span className="hidden 2xl:inline">Mastery</span>
              </Button>
              <Button variant="ghost" size="sm" className={`h-10 gap-2 rounded-xl px-3 font-bold text-violet-700 ${pathIs('/games/language-quest/leaderboard') ? 'bg-violet-50 dark:bg-violet-500/10' : ''}`} title="Leaderboard" render={<Link to="/games/language-quest/leaderboard" aria-current={pathIs('/games/language-quest/leaderboard') ? 'page' : undefined} />} nativeButton={false}>
                <Trophy className="h-4 w-4" /><span className="hidden 2xl:inline">Leaderboard</span>
              </Button>
              <Button variant="ghost" size="sm" className={`h-10 gap-2 rounded-xl px-3 font-bold text-indigo-700 ${pathIs('/games/language-quest/classrooms') ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''}`} title="Classrooms" render={<Link to={classroomsHref} aria-current={pathIs('/games/language-quest/classrooms') ? 'page' : undefined} />} nativeButton={false}>
                <GraduationCap className="h-4 w-4" /><span className="hidden 2xl:inline">Classrooms</span>
              </Button>
            </nav>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-xl border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" aria-label="Open Language Quest navigation" title="Navigation" />}
                nativeButton={true}
              >
                <Menu className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-xl p-1.5">
                <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-black uppercase tracking-wider">Explore</DropdownMenuLabel>
                <DropdownMenuItem render={<Link to="/games/language-quest" className="flex min-h-10 w-full items-center gap-2.5 px-2" />}><Home /> Course library</DropdownMenuItem>
                <DropdownMenuItem render={<Link to="/games/language-quest/words" className="flex min-h-10 w-full items-center gap-2.5 px-2" />}><BookOpenText /> My learned words</DropdownMenuItem>
                <DropdownMenuItem render={<Link to="/games/language-quest/mastery" className="flex min-h-10 w-full items-center gap-2.5 px-2" />}><Brain /> Mastery reviews</DropdownMenuItem>
                <DropdownMenuItem render={<Link to="/games/language-quest/leaderboard" className="flex min-h-10 w-full items-center gap-2.5 px-2" />}><Trophy /> Leaderboard</DropdownMenuItem>
                <DropdownMenuItem render={<Link to={classroomsHref} className="flex min-h-10 w-full items-center gap-2.5 px-2" />}><GraduationCap /> Classrooms</DropdownMenuItem>
                {canManage && <DropdownMenuSeparator />}
                {canManage && <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-black uppercase tracking-wider">Administration</DropdownMenuLabel>}
                {canManage && <DropdownMenuItem render={<Link to="/games/language-quest/manage" className="flex min-h-10 w-full items-center gap-2.5 px-2" />}><Settings2 /> Manage courses</DropdownMenuItem>}
                {canManage && <DropdownMenuItem render={<Link to="/games/language-quest/analytics" className="flex min-h-10 w-full items-center gap-2.5 px-2" />}><BarChart3 /> Learning analytics</DropdownMenuItem>}
                {isAdmin && <DropdownMenuItem render={<Link to="/games/language-quest/learners" className="flex min-h-10 w-full items-center gap-2.5 px-2" />}><Users /> Manage learners</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>

            {canManage && (
              <div className="hidden lg:block">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="outline" size="sm" className="h-10 min-w-10 shrink-0 gap-2 rounded-xl border-slate-200 bg-white px-2.5 font-bold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" aria-label="Open administration tools" title="Administration tools" />}
                    nativeButton={true}
                  >
                    <Settings2 className="h-4 w-4" /><span className="hidden 2xl:inline">Admin tools</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60 rounded-xl p-1.5">
                    <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-black uppercase tracking-wider">Administration</DropdownMenuLabel>
                    <DropdownMenuItem render={<Link to="/games/language-quest/manage" className="flex min-h-10 w-full items-center gap-2.5 px-2" />}><Settings2 /> Manage courses</DropdownMenuItem>
                    <DropdownMenuItem render={<Link to="/games/language-quest/analytics" className="flex min-h-10 w-full items-center gap-2.5 px-2" />}><BarChart3 /> Learning analytics</DropdownMenuItem>
                    <DropdownMenuItem render={<Link to="/games/language-quest/classrooms" className="flex min-h-10 w-full items-center gap-2.5 px-2" />}><GraduationCap /> Manage classrooms</DropdownMenuItem>
                    {isAdmin && <DropdownMenuItem render={<Link to="/games/language-quest/learners" className="flex min-h-10 w-full items-center gap-2.5 px-2" />}><Users /> Manage learners</DropdownMenuItem>}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            <span className="mx-1 hidden h-7 w-px bg-slate-200 sm:block dark:bg-slate-700" aria-hidden="true" />

            <DropdownMenu>
              <DropdownMenuTrigger
                render={<button type="button" className="shrink-0 rounded-2xl outline-none ring-offset-2 transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-violet-500" aria-label={`Open account menu for ${user?.name || 'learner'}`} title={user?.name || 'Account'} />}
                nativeButton={true}
              >
                <LanguageQuestAvatar avatarId={user?.languageQuestAvatar} name={user?.name} className="h-10 w-10 text-lg shadow-sm" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 rounded-xl p-1.5">
                <DropdownMenuLabel className="px-2 py-2">
                  <span className="block truncate text-sm font-black text-slate-900 dark:text-white">{user?.name || 'Language Quest learner'}</span>
                  <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">{user?.role || 'Learner'}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link to="/games/language-quest/profile" className="flex min-h-10 w-full items-center gap-2.5 px-2" />}><UserRound /> My profile</DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={signOut} className="min-h-10 gap-2.5 px-2"><LogOut /> Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <LanguageQuestDictionary />
            <LanguageQuestExplanationToggle />
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 rounded-xl border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-violet-50 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-slate-800"
              onClick={() => setTheme(darkMode ? 'light' : 'dark')}
              aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
              title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
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
