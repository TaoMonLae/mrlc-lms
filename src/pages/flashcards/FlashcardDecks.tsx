import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, Plus, Pencil, Trash2, BookOpen, Download, Brain, Grid3x3, SpellCheck, BarChart3, Users, Copy, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiGet, apiSend } from '../../lib/api';
import { cardsToCsv, downloadCsv } from '../../lib/flashcardCsv';

interface DeckRow {
  id: string;
  title: string;
  description: string | null;
  updatedAt: string;
  subject: { id: string; name: string } | null;
  teacherName: string;
  authorName?: string;
  cardCount: number;
  classes: { id: string; name: string }[];
  shared: boolean;
}

interface CommunityDeckRow {
  id: string;
  title: string;
  description: string | null;
  updatedAt: string;
  subject: { id: string; name: string } | null;
  teacherName: string;
  authorName?: string;
  cardCount: number;
}

export default function FlashcardDecks() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState<DeckRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [community, setCommunity] = useState<CommunityDeckRow[] | null>(null);
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const [cloningId, setCloningId] = useState<string | null>(null);

  const load = () => {
    apiGet<DeckRow[]>('/api/flashcards/decks')
      .then((d) => setDecks(Array.isArray(d) ? d : []))
      .catch((e: any) => toast.error(e?.message || 'Failed to load flashcard decks'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const loadCommunity = () => {
    if (community !== null || loadingCommunity) return;
    setLoadingCommunity(true);
    apiGet<CommunityDeckRow[]>('/api/flashcards/community')
      .then((d) => setCommunity(Array.isArray(d) ? d : []))
      .catch((e: any) => toast.error(e?.message || 'Failed to load community decks'))
      .finally(() => setLoadingCommunity(false));
  };

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

  const exportDeck = async (deckId: string, title: string) => {
    try {
      const full = await apiGet<{ cards: { term: string; definition: string }[] }>(`/api/flashcards/decks/${deckId}`);
      const cards = full.cards || [];
      if (cards.length === 0) { toast.error('This deck has no cards to export'); return; }
      downloadCsv(`${title.replace(/[^\w\- ]+/g, '') || 'flashcards'}.csv`, cardsToCsv(cards));
    } catch (e: any) {
      toast.error(e?.message || 'Failed to export deck');
    }
  };

  const cloneDeck = async (deck: CommunityDeckRow) => {
    setCloningId(deck.id);
    try {
      const res = await apiSend<{ id: string }>(`/api/flashcards/decks/${deck.id}/clone`, 'POST', {});
      toast.success(`Cloned "${deck.title}" into your decks`);
      navigate(`/flashcards/${res.id}/edit`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to clone deck');
    } finally {
      setCloningId(null);
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

      <Tabs defaultValue="mine" onValueChange={(v) => { if (v === 'community') loadCommunity(); }}>
        <TabsList>
          <TabsTrigger value="mine">My Decks</TabsTrigger>
          <TabsTrigger value="community"><Users className="mr-1.5 h-3.5 w-3.5" /> Community</TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-slate-500">Loading…</span>
            </div>
          ) : decks.length === 0 ? (
            <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-12 text-center">
              <Layers className="h-12 w-12 mx-auto text-slate-200 mb-3" />
              <p className="text-lg font-medium text-slate-900 dark:text-white">No flashcard decks yet</p>
              <p className="text-sm text-slate-500 mb-4">Create your first deck to help students study key terms, or clone one from Community.</p>
              <Button render={<Link to="/flashcards/new" />}>
                <Plus className="mr-2 h-4 w-4" /> New Deck
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {decks.map((d) => (
                <div key={d.id} className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm p-5 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      {d.title}
                      {d.shared && <Share2 className="h-3.5 w-3.5 text-aubergine-500 shrink-0" aria-label="Shared with other teachers" />}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Student progress" render={<Link to={`/flashcards/${d.id}/progress`} />}>
                        <BarChart3 className="h-3.5 w-3.5" />
                      </Button>
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
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs ml-auto" onClick={() => exportDeck(d.id, d.title)}><Download className="mr-1 h-3 w-3" /> CSV</Button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Updated {new Date(d.updatedAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="community" className="pt-4">
          {loadingCommunity ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-slate-500">Loading…</span>
            </div>
          ) : !community || community.length === 0 ? (
            <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-12 text-center">
              <Users className="h-12 w-12 mx-auto text-slate-200 mb-3" />
              <p className="text-lg font-medium text-slate-900 dark:text-white">No shared decks yet</p>
              <p className="text-sm text-slate-500">When other teachers share a deck, it'll show up here for you to clone.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {community.map((d) => (
                <div key={d.id} className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm p-5 flex flex-col">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{d.title}</h3>
                  {d.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{d.description}</p>}
                  <div className="flex items-center gap-2 flex-wrap mt-3">
                    <Badge variant="outline" className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {d.cardCount} card{d.cardCount === 1 ? '' : 's'}</Badge>
                    {d.subject && <Badge variant="outline">{d.subject.name}</Badge>}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">By {d.authorName || d.teacherName || 'Teacher'}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-3 border-t border-slate-100 dark:border-surface-raised">
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" render={<Link to={`/flashcards/${d.id}/study`} />}>Preview</Button>
                    <Button size="sm" className="h-7 px-2 text-xs ml-auto" onClick={() => cloneDeck(d)} disabled={cloningId === d.id}>
                      <Copy className="mr-1 h-3 w-3" /> {cloningId === d.id ? 'Cloning…' : 'Clone'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
