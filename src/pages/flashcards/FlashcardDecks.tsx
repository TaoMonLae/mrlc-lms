import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Plus, Pencil, Trash2, BookOpen, Download, Brain, Grid3x3, SpellCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiGet, apiSend } from '../../lib/api';
import { cardsToCsv, downloadCsv } from '../../lib/flashcardCsv';

interface DeckRow {
  id: string;
  title: string;
  description: string | null;
  updatedAt: string;
  subject: { id: string; name: string } | null;
  teacherName: string;
  cardCount: number;
  classes: { id: string; name: string }[];
}

export default function FlashcardDecks() {
  const [decks, setDecks] = useState<DeckRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    apiGet<DeckRow[]>('/api/flashcards/decks')
      .then((d) => setDecks(Array.isArray(d) ? d : []))
      .catch((e: any) => toast.error(e?.message || 'Failed to load flashcard decks'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const remove = async (deck: DeckRow) => {
    if (!window.confirm(`Delete the deck "${deck.title}"? This cannot be undone.`)) return;
    try {
      await apiSend(`/api/flashcards/decks/${deck.id}`, 'DELETE');
      toast.success('Deck deleted');
      setDecks((prev) => prev.filter((d) => d.id !== deck.id));
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete deck');
    }
  };

  const exportDeck = async (deck: DeckRow) => {
    try {
      const full = await apiGet<{ cards: { term: string; definition: string }[] }>(`/api/flashcards/decks/${deck.id}`);
      const cards = full.cards || [];
      if (cards.length === 0) { toast.error('This deck has no cards to export'); return; }
      downloadCsv(`${deck.title.replace(/[^\w\- ]+/g, '') || 'flashcards'}.csv`, cardsToCsv(cards));
    } catch (e: any) {
      toast.error(e?.message || 'Failed to export deck');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="h-6 w-6 text-aubergine-600" />
            Flashcards
          </h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">
            Build study decks and assign them to your classes.
          </p>
        </div>
        <Button render={<Link to="/flashcards/new" />}>
          <Plus className="mr-2 h-4 w-4" /> New Deck
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-slate-500">Loading…</span>
        </div>
      ) : decks.length === 0 ? (
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-12 text-center">
          <Layers className="h-12 w-12 mx-auto text-slate-200 mb-3" />
          <p className="text-lg font-medium text-slate-900 dark:text-white">No flashcard decks yet</p>
          <p className="text-sm text-slate-500 mb-4">Create your first deck to help students study key terms.</p>
          <Button render={<Link to="/flashcards/new" />}>
            <Plus className="mr-2 h-4 w-4" /> New Deck
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((d) => (
            <div key={d.id} className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-900 dark:text-white">{d.title}</h3>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" render={<Link to={`/flashcards/${d.id}/edit`} />}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500 hover:text-rose-600" onClick={() => remove(d)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {d.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{d.description}</p>}
              <div className="flex items-center gap-2 flex-wrap mt-3">
                <Badge variant="outline" className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {d.cardCount} card{d.cardCount === 1 ? '' : 's'}</Badge>
                {d.subject && <Badge variant="outline">{d.subject.name}</Badge>}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {d.classes.length === 0 ? (
                  <span className="text-xs text-amber-600">Not assigned to any class yet</span>
                ) : (
                  d.classes.map((c) => (
                    <Badge key={c.id} className="bg-aubergine-100 text-aubergine-800 dark:bg-aubergine-900/30 dark:text-aubergine-400 border-0 text-[10px]">{c.name}</Badge>
                  ))
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-3 border-t border-slate-100 dark:border-surface-raised">
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" render={<Link to={`/flashcards/${d.id}/study`} />}>Preview</Button>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" render={<Link to={`/flashcards/${d.id}/quiz`} />}><Brain className="mr-1 h-3 w-3" /> Quiz</Button>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" render={<Link to={`/flashcards/${d.id}/match`} />}><Grid3x3 className="mr-1 h-3 w-3" /> Match</Button>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" render={<Link to={`/flashcards/${d.id}/spell`} />}><SpellCheck className="mr-1 h-3 w-3" /> Spell</Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs ml-auto" onClick={() => exportDeck(d)}><Download className="mr-1 h-3 w-3" /> CSV</Button>
              </div>
              <p className="text-xs text-slate-400 mt-2">Updated {new Date(d.updatedAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
