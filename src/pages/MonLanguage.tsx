import { useState } from 'react';
import { ExternalLink, Languages, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MON_LANGUAGE_URL = 'https://the-mon-language.web.app/';

export default function MonLanguage() {
  const [loading, setLoading] = useState(true);

  return (
    <div className="flex h-[calc(100dvh-6rem)] min-h-[520px] flex-col gap-4 sm:h-[calc(100dvh-7rem)] lg:h-[calc(100dvh-8rem)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            <Languages className="h-6 w-6 text-aubergine-600" />
            The Mon Language
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            Learn and practise Mon language activities without leaving the platform.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<a href={MON_LANGUAGE_URL} target="_blank" rel="noopener noreferrer" />}
          nativeButton={false}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Open in new tab
        </Button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-surface-raised dark:bg-surface-indigo">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-surface-indigo">
            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-300">
              <Loader2 className="h-5 w-5 animate-spin text-aubergine-600" />
              Loading The Mon Language…
            </div>
          </div>
        )}
        <iframe
          src={MON_LANGUAGE_URL}
          title="The Mon Language learning app"
          className="h-full w-full border-0 bg-white"
          onLoad={() => setLoading(false)}
          allow="autoplay; clipboard-read; clipboard-write; microphone"
          sandbox="allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
