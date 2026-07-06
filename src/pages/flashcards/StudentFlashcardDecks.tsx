import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, BookOpen, Brain, Grid3x3, SpellCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiGet } from '../../lib/api';

interface DeckRow {
  id: string;
  title: string;
  description: string | null;
  updatedAt: string;
  subject: { id: string; name: string } | null;
  teacherName: string;
  cardCount: number;
}

export default function StudentFlashcardDecks() {
  const [decks, setDecks] = useState<DeckRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<DeckRow[]>('/api/flashcards/my-decks')
      .then((d) => setDecks(Array.isArray(d) ? d : []))
      .catch((e: any) => toast.error(e?.message || 'Failed to load flashcard decks'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="h-6 w-6 text-aubergine-600" />
          Flashcards
        </h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">
          Study decks your teachers have assigned to your class.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-slate-500">Loading…</span>
        </div>
      ) : decks.length === 0 ? (
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-12 text-center">
          <Layers className="h-12 w-12 mx-auto text-slate-200 mb-3" />
          <p className="text-lg font-medium text-slate-900 dark:text-white">No decks assigned yet</p>
          <p className="text-sm text-slate-500">Check back once your teacher assigns a flashcard deck to your class.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((d) => (
            <div
              key={d.id}
              className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm p-5"
            >
              <h3 className="font-semibold text-slate-900 dark:text-white">{d.title}</h3>
              {d.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{d.description}</p>}
              <div className="flex items-center gap-2 flex-wrap mt-3">
                <Badge variant="outline" className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {d.cardCount} card{d.cardCount === 1 ? '' : 's'}</Badge>
                {d.subject && <Badge variant="outline">{d.subject.name}</Badge>}
              </div>
              <p className="text-xs text-slate-400 mt-2">By {d.teacherName || 'Teacher'}</p>
              <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-3 border-t border-slate-100 dark:border-surface-raised">
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" render={<Link to={`/student/flashcards/${d.id}`} />}>Study</Button>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" render={<Link to={`/student/flashcards/${d.id}/quiz`} />}><Brain className="mr-1 h-3 w-3" /> Quiz</Button>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" render={<Link to={`/student/flashcards/${d.id}/match`} />}><Grid3x3 className="mr-1 h-3 w-3" /> Match</Button>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" render={<Link to={`/student/flashcards/${d.id}/spell`} />}><SpellCheck className="mr-1 h-3 w-3" /> Spell</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
