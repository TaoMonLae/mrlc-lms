import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Layers, Plus, Trash2, Save, Upload, Download, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { usePermissions } from '../../lib/permissions';
import { apiGet, apiSend, authHeaders } from '../../lib/api';
import { cardsToCsv, downloadCsv, parseFlashcardCsvFile } from '../../lib/flashcardCsv';

interface CardDraft { clientKey: string; id?: string; term: string; definition: string; imageUrl?: string | null }
interface ClassOption { id: string; name: string }
interface SubjectOption { id: string; name: string }

const MAX_CARDS = 500;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const newCard = (): CardDraft => ({ clientKey: crypto.randomUUID(), term: '', definition: '' });

export default function FlashcardDeckForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { isAdmin } = usePermissions();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [shared, setShared] = useState(false);
  const [classIds, setClassIds] = useState<string[]>([]);
  const [cards, setCards] = useState<CardDraft[]>([newCard(), newCard()]);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const uploadedUrlsRef = useRef(new Set<string>());
  const committedRef = useRef(false);

  const discardUnusedImage = (imageUrl?: string | null) => {
    if (!imageUrl || !uploadedUrlsRef.current.has(imageUrl)) return;
    uploadedUrlsRef.current.delete(imageUrl);
    void apiSend('/api/flashcards/image-upload', 'DELETE', { imageUrl }).catch(() => {});
  };

  useEffect(() => () => {
    if (committedRef.current) return;
    for (const imageUrl of uploadedUrlsRef.current) {
      void apiSend('/api/flashcards/image-upload', 'DELETE', { imageUrl }).catch(() => {});
    }
    uploadedUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      apiGet<any[]>('/api/classes')
        .then((d) => setClasses((d || []).map((c: any) => ({ id: c.id, name: c.name }))))
        .catch((e: any) => toast.error(e?.message || 'Failed to load classes'));
    } else {
      apiGet<any[]>('/api/teacher/classes')
        .then((d) => setClasses((d || []).map((c: any) => ({ id: c.classInfo?.id ?? c.id, name: c.classInfo?.name ?? c.name }))))
        .catch((e: any) => toast.error(e?.message || 'Failed to load classes'));
    }
    apiGet<any[]>('/api/subjects')
      .then((d) => setSubjects((d || []).map((s: any) => ({ id: s.id, name: s.name }))))
      .catch((e: any) => toast.error(e?.message || 'Failed to load subjects'));
  }, [isAdmin]);

  useEffect(() => {
    if (!id) return;
    apiGet<any>(`/api/flashcards/decks/${id}`)
      .then((d) => {
        setTitle(d.title || '');
        setDescription(d.description || '');
        setSubjectId(d.subject?.id || '');
        setShared(!!d.shared);
        setClassIds((d.classes || []).map((c: any) => c.id));
        setCards(d.cards?.length ? d.cards.map((c: any) => ({ clientKey: crypto.randomUUID(), id: c.id, term: c.term, definition: c.definition, imageUrl: c.imageUrl ?? null })) : [newCard()]);
      })
      .catch((e: any) => { setLoadFailed(true); toast.error(e?.message || 'Failed to load deck'); })
      .finally(() => setLoading(false));
  }, [id]);

  const toggleClass = (classId: string) => {
    setClassIds((prev) => (prev.includes(classId) ? prev.filter((c) => c !== classId) : [...prev, classId]));
  };

  const updateCard = (index: number, field: 'term' | 'definition', value: string) => {
    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };
  const addCard = () => setCards((prev) => {
    if (prev.length >= MAX_CARDS) { toast.error(`A deck can contain at most ${MAX_CARDS} cards`); return prev; }
    return [...prev, newCard()];
  });
  const removeCard = (index: number) => setCards((prev) => {
    if (prev.length <= 1) return prev;
    discardUnusedImage(prev[index]?.imageUrl);
    return prev.filter((_, i) => i !== index);
  });

  const setCardImage = (clientKey: string, imageUrl: string | null) => {
    setCards((prev) => prev.map((c) => (c.clientKey === clientKey ? { ...c, imageUrl } : c)));
  };

  const uploadCardImage = async (clientKey: string, file: File) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) { toast.error('Use a PNG, JPG, WEBP, or GIF image'); return; }
    if (file.size > MAX_IMAGE_BYTES) { toast.error('Image must be 8 MB or smaller'); return; }
    setUploadingKey(clientKey);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/flashcards/image-upload', { method: 'POST', headers: authHeaders(), body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      uploadedUrlsRef.current.add(data.url);
      setCards((prev) => {
        const target = prev.find((card) => card.clientKey === clientKey);
        if (!target) { discardUnusedImage(data.url); return prev; }
        discardUnusedImage(target.imageUrl);
        return prev.map((card) => card.clientKey === clientKey ? { ...card, imageUrl: data.url } : card);
      });
    } catch (e: any) {
      toast.error(e.message || 'Image upload failed');
    } finally {
      setUploadingKey(null);
    }
  };

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
        const importedCards = imported.map((card) => ({ ...card, clientKey: crypto.randomUUID() }));
        const existingBlank = prev.every((card) => !card.term.trim() && !card.definition.trim() && !card.imageUrl);
        const next = existingBlank ? importedCards : [...prev, ...importedCards];
        if (next.length > MAX_CARDS) {
          toast.error(`Only the first ${MAX_CARDS} cards were kept`);
          return next.slice(0, MAX_CARDS);
        }
        return next;
      });
      toast.success(`Imported ${imported.length} card${imported.length === 1 ? '' : 's'}`);
    } catch {
      toast.error('Could not read that CSV file');
    }
  };

  const save = async () => {
    if (uploadingKey) { toast.error('Wait for the image upload to finish'); return; }
    const incompleteIndex = cards.findIndex((c) => Boolean(c.term.trim()) !== Boolean(c.definition.trim()));
    if (incompleteIndex >= 0) { toast.error(`Card ${incompleteIndex + 1} needs both a term and a definition`); return; }
    const validCards = cards.filter((c) => c.term.trim() && c.definition.trim());
    if (!title.trim()) { toast.error('Give the deck a title'); return; }
    if (validCards.length === 0) { toast.error('Add at least one card with both a term and a definition'); return; }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(), description: description.trim() || null,
        subjectId: subjectId || null, shared, classIds,
        cards: validCards.map(({ clientKey: _clientKey, ...card }) => card),
      };
      if (isEdit) {
        await apiSend(`/api/flashcards/decks/${id}`, 'PUT', payload);
        toast.success('Deck updated');
      } else {
        await apiSend('/api/flashcards/decks', 'POST', payload);
        toast.success('Deck created');
      }
      committedRef.current = true;
      uploadedUrlsRef.current.clear();
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

  if (loadFailed) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>Couldn't load this flashcard deck.</p>
        <Button variant="outline" className="mt-4" render={<Link to="/flashcards" />}>Back to Flashcards</Button>
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
          <Input id="deck-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 5 Vocabulary" maxLength={200} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deck-desc">Description (optional)</Label>
          <Textarea id="deck-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this deck covers" rows={2} maxLength={1000} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Subject (optional)</Label>
            <Select value={subjectId || 'none'} onValueChange={(v) => setSubjectId(v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="No subject" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No subject</SelectItem>
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
        <div className="flex items-start gap-2 pt-2 border-t border-slate-100 dark:border-surface-raised">
          <Checkbox checked={shared} onCheckedChange={(v) => setShared(!!v)} id="deck-shared" className="mt-0.5" />
          <Label htmlFor="deck-shared" className="text-sm font-normal cursor-pointer text-slate-600 dark:text-slate-300">
            Share this deck with other teachers -- they'll be able to find it in Community and clone a copy into their own library, but can't edit your original.
          </Label>
        </div>
      </div>

      <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">Cards</h2>
            <p className="text-xs text-slate-400">{cards.length} / {MAX_CARDS}</p>
          </div>
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
        <p className="text-xs text-slate-400 -mt-1">Tip: wrap math in <code className="px-1 rounded bg-slate-100 dark:bg-surface-raised">$...$</code> (e.g. <code className="px-1 rounded bg-slate-100 dark:bg-surface-raised">$x^2 + 1$</code>) to render it as a formula, and click the square next to a card to attach an image.</p>
        <div className="space-y-3">
          {cards.map((c, i) => {
            const incomplete = Boolean(c.term.trim()) !== Boolean(c.definition.trim());
            return (
            <div key={c.clientKey} className={`flex flex-wrap sm:flex-nowrap gap-2 items-start rounded-lg ${incomplete ? 'ring-1 ring-rose-300 p-2' : ''}`}>
              <span className="mt-2.5 text-xs font-semibold text-slate-400 w-5 shrink-0">{i + 1}.</span>

              <div className="flex flex-col items-center gap-1 shrink-0">
                <label
                  htmlFor={`card-img-${i}`}
                  className="relative h-9 w-9 rounded-md border border-dashed border-slate-300 dark:border-surface-raised flex items-center justify-center cursor-pointer overflow-hidden bg-slate-50 dark:bg-surface-raised/40 hover:border-aubergine-300"
                  title="Add an image to this card"
                >
                  {uploadingKey === c.clientKey ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-aubergine-600 border-t-transparent" />
                  ) : c.imageUrl ? (
                    <img src={c.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus className="h-4 w-4 text-slate-400" />
                  )}
                </label>
                <input
                  id={`card-img-${i}`}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) uploadCardImage(c.clientKey, f); }}
                />
                {c.imageUrl && (
                  <button type="button" onClick={() => { discardUnusedImage(c.imageUrl); setCardImage(c.clientKey, null); }} className="flex items-center text-[10px] text-rose-500 hover:underline">
                    <X className="h-2.5 w-2.5" /> remove
                  </button>
                )}
              </div>

              <Input
                value={c.term}
                onChange={(e) => updateCard(i, 'term', e.target.value)}
                placeholder="Term"
                className="flex-1"
                maxLength={500}
              />
              <Textarea
                value={c.definition}
                onChange={(e) => updateCard(i, 'definition', e.target.value)}
                placeholder="Definition"
                rows={1}
                className="flex-1 min-h-0 resize-none"
                maxLength={2000}
              />
              <Button size="icon" variant="ghost" className="h-9 w-9 text-rose-500 hover:text-rose-600 shrink-0" onClick={() => removeCard(i)} disabled={cards.length === 1}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );})}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate('/flashcards')}>Cancel</Button>
        <Button onClick={save} disabled={saving || !!uploadingKey}>
          <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving…' : 'Save Deck'}
        </Button>
      </div>
    </div>
  );
}
