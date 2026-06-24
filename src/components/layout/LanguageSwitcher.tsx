import { Languages, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/src/i18n/I18nProvider';

export function LanguageSwitcher() {
  const { lang, languages, setLang } = useI18n();

  // Hide entirely if only English is available — nothing to switch to.
  if (languages.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-raised rounded-full transition-colors"
            aria-label="Change language"
          />
        }
        nativeButton={true}
      >
        <Languages className="h-5 w-5" />
        <span className="sr-only">Change language</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]" data-no-i18n>
        {languages.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code)}
            className="flex items-center justify-between"
          >
            <span>{l.label}</span>
            {l.code === lang && <Check className="h-4 w-4 text-aubergine-600" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LanguageSwitcher;
