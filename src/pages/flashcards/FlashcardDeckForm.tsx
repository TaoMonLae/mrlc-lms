import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Layers, Plus, Trash2, Save, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { usePermissions } from '../../lib/permissions';
import { apiGet, apiSend } from '../../lib/api';
import { cardsToCsv, downloadCsv, parseFlashcardCsvFile } from '../../lib/flashcardCsv';

interface CardDraft { term: string; definition: string }
interface ClassOption { id: string; name: string }
interface SubjectOption { id: string; name: string }

export default function FlashcardDeckForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { isAdmin } = usePermissions();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [classIds, setClassIds] = useState<string[]>([]);
  const [cards, setCards] = useState<CardDraft[]>([{ term: '', definition: '' }, { term: '', definition: '' }]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      apiGet<any[]>('/api/classes')
        .then((d) => setClasses((d || []).map((c: any) => ({ id: c.id, name: c.name }))))
        .catch(() => {});
    } else {
      apiGet<any[]>('/api/teacher/classes')
        .then((d) => setClasses((d || []).map((c: any) => ({ id: c.classInfo?.id ?? c.id, name: c.classInfo?.name ?? c.name }))))
        .catch(() => {});
    }
    apiGet<any[]>('/api/subjects')
      .then((d) => setSubjects((d || []).map((s: any) => ({ id: s.id, name: s.name }))))
      .catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    if (!id) return;
    apiGet<any>(`/api/flashcards/decks/${id}`)
      .then((d) => {
        setTitle(d.title || '');
        setDescription(d.description || '');
        setSubjectId(d.subject?.id || '');
        setClassIds((d.classes || []).map((c: any) => c.id));
        setCards(d.cards?.length ? d.cards.map((c: any) => ({ term: c.term, definition: c.definition })) : [{ term: '', definition: '' }]);
      })
      .catch((e: any) => toast.error(e?.message || 'Failed to load deck'))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleClass = (classId: string) => {
    setClassIds((prev) => (prev.includes(classId) ? prev.filter((c) => c !== classId) : [...prev, classId]));
  };

  const updateCard = (index: number, field: 'term' | 'definition', value: string) => {
    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };
  const addCard = () => setCards((prev) => [...prev, { term: '', definition: '' }]);
  const removeCard = (index: number) => setCards((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const csvInputRef = useRef<HTMLInputElement>(null);
  const exportCsv = () => {
    const valid = cards.filter((c) => c.term.trim() && c.definition.trim());
    if (valid.length === 0) { toast.error('Add some cards before exporting'); return; }
    downloadCsv(`${(title || 'flashcards').trim().replace(/[^\w\- ]+/g, '') || 'flashcards'}.csv`, cardsToCsv(valid));
  };
  const importCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    try {
      const imported = await parseFlashcardCsvFile(file);
      if (imported.length === 0) { toast.error('No term/definition rows found in that file'); return; }
      setCards((prev) => {
        const existingBlank = prev.length === 1 && !prev[0].term.trim() && !prev[0].definition.trim();
        return existingBlank ? imported : [...prev, ...imported];
      });
      toast.success(`Imported ${imported.length} card${imported.length === 1 ? '' : 's'}`);
    } catch {
      toast.error('Could not read that CSV file');
    }
  };

  const save = async () => {
    const validCards = cards.filter((c) => c.term.trim() && c.definition.trim());
    if (!title.trim()) { toast.error('Give the deck a title'); return; }
    if (validCards.length === 0) { toast.error('Add at least one card with both a term and a definition'); return; }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(), description: description.trim() || null,
        subjectId: subjectId || null, classIds, cards: validCards,
      };
      if (isEdit) {
        await apiSend(`/api/flashcards/decks/${id}`, 'PUT', payload);
        toast.success('Deck updated');
      } else {
        await apiSend('/api/flashcards/decks', 'POST', payload);
        toast.success('Deck created');
      }
      navigate('/flashcards');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save deck');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="animate-spin rounded-full h-6 w-6 border-2 border-aubergine-600 border-t-transparent mr-2"></span>
        <span className="text-slate-500">Loading deck…</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link to="/flashcards" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="h-6 w-6 text-aubergine-600" />
          {isEdit ? 'Edit Deck' : 'New Deck'}
        </h1>
      </div>

      <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="deck-title">Title</Label>
          <Input id="deck-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 5 Vocabulary" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deck-desc">Description (optional)</Label>
          <Textarea id="deck-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this deck covers" rows={2} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Subject (optional)</Label>
            <Select value={subjectId || undefined} onValueChange={(v) => setSubjectId(v)}>
              <SelectTrigger><SelectValue placeholder="No subject" /></SelectTrigger>
              <SelectContent>
                {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Assign to classes</Label>
          {classes.length === 0 ? (
            <p className="text-sm text-slate-400">No classes available.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {classes.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm rounded-lg border border-slate-200 dark:border-surface-raised px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-surface-raised/50">
                  <Checkbox checked={classIds.includes(c.id)} onCheckedChange={() => toggleClass(c.id)} />
                  {c.name}
                </label>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-400">Students in the selected classes will be able to study this deck. You can leave this unassigned and set it later.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 dark:text-white">Cards</h2>
          <Button size="sm" variant="outline" onClick={addCard}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Card
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 -mt-1">
          <input ref={csvInputRef} type="file" accept=".csv,.tsv,text/csv" onChange={importCsv} className="hidden" />
          <Button size="sm" variant="outline" onClick={() => csvInputRef.current?.click()}>
            <Upload className="mr-1.5 h-3.5 w-3.5" /> Import CSV
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
          </Button>
          <span className="text-xs text-slate-400">Two columns: term, definition. A header row is optional.</span>
        </div>
        <div className="space-y-3">
          {cards.map((c, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="mt-2.5 text-xs font-semibold text-slate-400 w-5 shrink-0">{i + 1}.</span>
              <Input
                value={c.term}
                onChange={(e) => updateCard(i, 'term', e.target.value)}
                placeholder="Term"
                className="flex-1"
              />
              <Textarea
                value={c.definition}
                onChange={(e) => updateCard(i, 'definition', e.target.value)}
                placeholder="Definition"
                rows={1}
                className="flex-1 min-h-0 resize-none"
              />
              <Button size="icon" variant="ghost" className="h-9 w-9 text-rose-500 hover:text-rose-600 shrink-0" onClick={() => removeCard(i)} disabled={cards.length === 1}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" render={<Link to="/flashcards" />}>Cancel</Button>
        <Button onClick={save} disabled={saving}>
          <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving…' : 'Save Deck'}
        </Button>
      </div>
    </div>
  );
}
