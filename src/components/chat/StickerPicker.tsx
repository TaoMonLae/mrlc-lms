import { useEffect, useRef, useState } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiGet } from '../../lib/api';

interface StickerPack { name: string; editable: boolean; stickers: string[] }

/** A chat message is a sticker when its attachment lives in a sticker folder. */
export const isStickerUrl = (url?: string | null) =>
  !!url && (url.includes('/stickers/') || url.includes('/uploads/stickers/'));

export function StickerPicker({ onSelect }: { onSelect: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  const [packs, setPacks] = useState<StickerPack[]>([]);
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || loaded) return;
    apiGet<{ packs: StickerPack[] }>('/api/chat/stickers')
      .then((d) => setPacks((d?.packs ?? []).filter((p) => p.stickers.length > 0)))
      .catch(() => setPacks([]))
      .finally(() => setLoaded(true));
  }, [open, loaded]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const current = packs[active];

  return (
    <div className="relative" ref={ref}>
      <Button aria-label="Stickers" type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" title="Stickers" onClick={() => setOpen((o) => !o)}>
        <Smile className="h-4 w-4 text-muted-foreground" />
      </Button>
      {open && (
        <div className="absolute bottom-11 left-0 z-50 w-56 rounded-sm border border-border bg-card p-2 shadow-none">
          {!loaded ? (
            <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>
          ) : packs.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">No stickers yet</p>
          ) : (
            <>
              {packs.length > 1 && (
                <div className="mb-1 flex gap-1 overflow-x-auto border-b border-border pb-1">
                  {packs.map((p, i) => (
                    <button key={p.name} type="button" onClick={() => setActive(i)}
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium ${i === active ? 'bg-aubergine-100 text-aubergine-700' : 'text-muted-foreground hover:bg-muted'}`}>
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid max-h-48 grid-cols-4 gap-1 overflow-y-auto">
                {current?.stickers.map((url) => (
                  <button key={url} type="button" onClick={() => { onSelect(url); setOpen(false); }} className="rounded-lg p-0.5 hover:bg-muted">
                    <img src={url} alt="sticker" className="h-12 w-12 object-contain" loading="lazy" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
