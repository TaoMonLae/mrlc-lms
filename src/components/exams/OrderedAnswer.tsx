import { useState } from 'react';
import { GripVertical } from 'lucide-react';

type Props = {
  rows: { label: string; blankId: string }[];
  options: { key: string; label: string }[];
  matches: Record<string, string | number>;
  onPlace: (blankId: string, key: string) => void;
  onClear: (blankId: string) => void;
};

export default function OrderedAnswer({ rows, options, matches, onPlace, onClear }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const used = new Set(Object.values(matches).map(String));
  const available = options.filter(option => !used.has(option.key));
  function place(blankId: string, key: string) {
    if (!available.some(option => option.key === key)) return;
    onPlace(blankId, key);
    setSelected(null);
  }

  return <div className="ep-order">
    <p>Drag a choice into position, or select a choice and then a position.</p>
    <ol aria-label="Your sequence">
      {rows.map(({ label, blankId }) => {
        const choice = options.find(option => option.key === String(matches[blankId]));
        return <li key={blankId}>
          <span className="ep-order-rank">{label}</span>
          <button type="button" className="ep-order-slot" data-filled={!!choice}
            aria-label={`${label} position, ${choice ? choice.label + '. Select to clear or replace.' : 'empty'}`}
            onDragOver={event => event.preventDefault()}
            onDrop={event => { event.preventDefault(); place(blankId, event.dataTransfer.getData('text/plain')); }}
            onClick={() => { if (selected !== null) place(blankId, selected); else if (choice) onClear(blankId); }}>
            {choice?.label ?? 'Place choice here'}
          </button>
        </li>;
      })}
    </ol>
    <div className="ep-order-bank" role="group" aria-label="Answer choices">
      <strong>Answer choices</strong>
      {available.map(option => <button key={option.key} type="button" draggable aria-pressed={selected === option.key}
        onDragStart={event => { event.dataTransfer.setData('text/plain', option.key); event.dataTransfer.effectAllowed = 'move'; }}
        onClick={() => setSelected(selected === option.key ? null : option.key)}>
        <GripVertical size={16} aria-hidden="true" />{option.label}
      </button>)}
      {used.size > 0 && <p>Select a filled position to clear it.</p>}
    </div>
  </div>;
}
