import { useRef, useState } from 'react';
import { ArrowUp, Delete, Shuffle } from 'lucide-react';

export function LetterWheel({ letters, onSubmit, disabled }: { letters: string; onSubmit: (word: string) => void; disabled: boolean }) {
  const [order, setOrder] = useState(() => letters.split(''));
  const [selected, setSelected] = useState<number[]>([]);
  const path = useRef<number[]>([]);
  const gesture = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const points = order.map((_, i) => ({ x: 140 + Math.sin(i * Math.PI * 2 / order.length) * 92, y: 140 - Math.cos(i * Math.PI * 2 / order.length) * 92 }));
  const word = selected.map(i => order[i]).join('');
  function change(next: number[]) { path.current = next; setSelected(next); }
  function add(index: number) {
    const current = path.current;
    if (current.length > 1 && current[current.length - 2] === index) change(current.slice(0, -1));
    else if (!current.includes(index)) change([...current, index]);
  }
  function submit() {
    const candidate = path.current.map(i => order[i]).join('');
    if (candidate && !disabled) onSubmit(candidate);
    change([]);
  }
  return <div className="wc-wheel-section">
    <div className="wc-word-strip" aria-live="polite" aria-label="Your word">{word || <span>Connect the letters</span>}</div>
    <div ref={surface} className="wc-wheel" tabIndex={0} role="group" aria-label="Letter wheel. Type letters, Enter to submit, Backspace to undo, Escape to clear."
      onKeyDown={event => {
        if (disabled || event.ctrlKey || event.metaKey || event.altKey) return;
        if (/^[a-z]$/i.test(event.key)) {
          event.preventDefault();
          const index = order.findIndex((letter, i) => letter === event.key.toUpperCase() && !path.current.includes(i));
          if (index >= 0) add(index);
        } else if (event.key === 'Enter' && event.target === event.currentTarget) { event.preventDefault(); submit(); }
        else if (event.key === 'Backspace') { event.preventDefault(); change(path.current.slice(0, -1)); }
        else if (event.key === 'Escape') { event.preventDefault(); change([]); }
      }}
      onPointerDown={event => {
        if (disabled || event.button !== 0 || gesture.current) return;
        const target = (event.target as HTMLElement).closest<HTMLElement>('[data-letter-index]');
        if (!target) return;
        event.preventDefault(); surface.current?.focus();
        add(Number(target.dataset.letterIndex));
        gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        const active = gesture.current;
        if (!active || active.id !== event.pointerId) return;
        if (Math.hypot(event.clientX - active.x, event.clientY - active.y) > 8) active.moved = true;
        if (!active.moved) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width * 280, y = (event.clientY - rect.top) / rect.height * 280;
        const index = points.findIndex(p => Math.hypot(p.x - x, p.y - y) < 28);
        if (index >= 0) add(index);
      }}
      onPointerUp={event => {
        const active = gesture.current;
        if (!active || active.id !== event.pointerId) return;
        gesture.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        if (active.moved) submit();
      }}
      onPointerCancel={() => { gesture.current = null; change([]); }}>
      <svg viewBox="0 0 280 280" aria-hidden="true"><polyline points={selected.map(i => `${points[i].x},${points[i].y}`).join(' ')} /></svg>
      <button className="wc-wheel-shuffle" type="button" aria-label="Shuffle letters" disabled={disabled} onClick={() => {
        change([]);
        setOrder(current => {
          const next = [...current];
          for (let i = next.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [next[i], next[j]] = [next[j], next[i]]; }
          return next;
        });
      }}><Shuffle size={22} /></button>
      {order.map((letter, i) => <button key={i} type="button" data-letter-index={i} className={`wc-letter ${selected.includes(i) ? 'is-selected' : ''}`} style={{ left: `${points[i].x / 2.8}%`, top: `${points[i].y / 2.8}%` }} aria-label={`Letter ${letter}`} aria-pressed={selected.includes(i)} disabled={disabled} onClick={event => { if (event.detail === 0) add(i); }}>{letter}</button>)}
    </div>
    <div className="wc-wheel-actions">
      <button className="wc-icon-button" type="button" aria-label="Undo last letter" disabled={!selected.length || disabled} onClick={() => change(path.current.slice(0, -1))}><Delete size={20} /></button>
      <button className="wc-button" type="button" disabled={!word || disabled} onClick={submit}>Check word <ArrowUp size={18} /></button>
    </div>
    <p className="wc-keyboard-help">Swipe or tap · Type on the wheel · Enter to check</p>
  </div>;
}
