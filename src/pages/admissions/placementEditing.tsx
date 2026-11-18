import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { displayOrder } from '../../../shared/placementTest';
import '../landing.css';
import '../placement-test.css';

export function useUnsavedGuard(dirty: boolean) {
  const navigate = useNavigate();
  const [pending, setPending] = useState<string | null>(null);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!dirtyRef.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link || link.target === '_blank' || link.hasAttribute('download') || link.dataset.skipGuard !== undefined) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      setPending(url.pathname + url.search + url.hash);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  const leave = useCallback((to: string) => {
    dirtyRef.current = false;
    setPending(null);
    navigate(to);
  }, [navigate]);

  const requestLeave = useCallback((to: string) => {
    if (dirtyRef.current) setPending(to);
    else navigate(to);
  }, [navigate]);

  const dialog = <Dialog open={pending !== null} onOpenChange={open => { if (!open) setPending(null); }}>
    <DialogContent showCloseButton={false} className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Leave without saving?</DialogTitle>
        <DialogDescription>Your changes are not saved to the draft. If you leave now, they stay on this device and you can restore them when you come back to this question.</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => pending && leave(pending)}>Leave page</Button>
        <Button type="button" autoFocus onClick={() => setPending(null)}>Stay and keep editing</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;

  return { dialog, requestLeave, leave };
}

export interface LocalDraft<T> { value: T; savedAt: string; baseUpdatedAt: string | null }

export function readLocalDraft<T>(key: string): LocalDraft<T> | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as LocalDraft<T> : null;
  } catch {
    return null;
  }
}

export function writeLocalDraft<T>(key: string, draft: LocalDraft<T> | null) {
  try {
    if (draft) window.localStorage.setItem(key, JSON.stringify(draft));
    else window.localStorage.removeItem(key);
  } catch {
    return;
  }
}

export interface PreviewPassage { title: string; body: string[] }

export function StudentQuestionPreview({ id, number, prompt, options, answer, passage, showAnswer, chosen, onChoose }: {
  id: string;
  number: number;
  prompt: string;
  options: string[];
  answer?: number;
  passage?: PreviewPassage | null;
  showAnswer?: boolean;
  chosen?: number;
  onChoose?: (value: number) => void;
}) {
  const order = displayOrder({ id, options }, 'preview');
  return <div className="landing placement-test pt-embed">
    <div className={passage ? 'pt-group pt-group-passage' : 'pt-group'}>
      {passage && <aside className="pt-passage" aria-label={`Passage: ${passage.title || 'Untitled'}`}>
        <h2>{passage.title || 'Untitled passage'}</h2>
        {(passage.body.length ? passage.body : ['']).map((paragraph, i) => <p key={i}>{paragraph || ' '}</p>)}
      </aside>}
      <div className="pt-questions">
        <fieldset className="pt-question">
          <legend><span className="pt-qnum">{number}</span><span className="pt-prompt">{prompt || 'Your question appears here.'}</span></legend>
          <div className="pt-options">
            {order.map((value, i) => {
              const inputId = `preview-${id}-${value}`;
              const correct = showAnswer && value === answer;
              return <label key={inputId} htmlFor={inputId} className={`pt-option${correct ? ' pt-option-correct' : ''}`}>
                <input id={inputId} type="radio" name={`preview-${id}`} checked={chosen === value} onChange={() => onChoose?.(value)} />
                <span className="pt-option-letter" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
                <span className="pt-option-text">{options[value] || ' '}{correct && <span className="sr-only"> (correct answer)</span>}</span>
              </label>;
            })}
          </div>
        </fieldset>
      </div>
    </div>
  </div>;
}
