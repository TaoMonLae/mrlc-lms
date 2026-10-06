import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Plus, Trash2, Save, Upload, Download, ImagePlus, X } from 'lucide-react';
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
import { StatePanel } from './shared';

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
      <div className="mx-auto w-full max-w-5xl space-y-4" aria-busy="true">
        <span className="sr-only">Loading deck…</span>
        <div className="h-8 w-1/3 bg-muted motion-safe:animate-pulse" />
        <div className="h-48 border border-border bg-card" />
        <div className="h-64 border border-border bg-card" />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="mx-auto max-w-2xl">
        <StatePanel
          tone="error"
          title="This deck couldn't be opened"
          body="It may have been deleted, or you may not be its author."
          action={<Button variant="outline" render={<Link to="/flashcards" />} nativeButton={false}>Back to the library</Button>}
        />
      </div>
    );
  }

  const filled = cards.filter((c) => c.term.trim() && c.definition.trim()).length;

  return (
    <div className="mx-auto w-full max-w-5xl pb-16 md:pb-0">
      <Link to="/flashcards" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-accent-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Flashcard library
      </Link>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{isEdit ? 'Edit deck' : 'New deck'}</h1>

      <section className="mt-6 border border-border bg-card" aria-labelledby="deck-details">
        <h2 id="deck-details" className="border-b border-foreground px-5 py-3 text-base font-semibold text-foreground sm:px-6">Details</h2>
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] sm:px-6">
          <div className="space-y-1.5">
            <Label htmlFor="deck-title">Title</Label>
            <Input id="deck-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chapter 5 vocabulary" maxLength={200} aria-required="true" />
          </div>
          <div className="space-y-1.5">
            <Label id="deck-subject-label">Subject <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Select value={subjectId || 'none'} onValueChange={(v) => setSubjectId(v === 'none' ? '' : String(v))}>
              <SelectTrigger aria-labelledby="deck-subject-label" className="w-full"><SelectValue placeholder="No subject" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No subject</SelectItem>
                {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="deck-desc">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea id="deck-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this deck covers" rows={2} maxLength={1000} />
          </div>
        </div>
      </section>

      <section className="mt-6 border border-border bg-card" aria-labelledby="deck-audience">
        <h2 id="deck-audience" className="border-b border-foreground px-5 py-3 text-base font-semibold text-foreground sm:px-6">Who studies it</h2>
        <div className="space-y-4 px-5 py-5 sm:px-6">
          <fieldset>
            <legend className="text-sm font-medium text-foreground">Assign to classes</legend>
            {classes.length === 0 ? (
              <p className="mt-1.5 text-sm text-muted-foreground">You have no classes to assign yet.</p>
            ) : (
              <div className="mt-2 grid grid-cols-1 border-l border-t border-border sm:grid-cols-2 lg:grid-cols-3">
                {classes.map((c) => (
                  <label key={c.id} className={`flex min-h-11 cursor-pointer items-center gap-2.5 border-b border-r border-border px-3 text-sm ${classIds.includes(c.id) ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-muted/40'}`}>
                    <Checkbox checked={classIds.includes(c.id)} onCheckedChange={() => toggleClass(c.id)} className="data-checked:border-academic-teal data-checked:bg-academic-teal data-checked:text-white" />
                    {c.name}
                  </label>
                ))}
              </div>
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              {classIds.length === 0 ? 'Not assigned yet. Students won’t see this deck until you pick a class.' : `Students in ${classIds.length} class${classIds.length === 1 ? '' : 'es'} will see this deck.`}
            </p>
          </fieldset>
          <label htmlFor="deck-shared" className="flex cursor-pointer items-start gap-2.5 border-t border-border pt-4 text-sm">
            <Checkbox checked={shared} onCheckedChange={(v) => setShared(!!v)} id="deck-shared" className="mt-0.5 data-checked:border-academic-teal data-checked:bg-academic-teal data-checked:text-white" />
            <span>
              <span className="block font-medium text-foreground">Share with other teachers</span>
              <span className="block text-muted-foreground">They can copy it into their own library. Your original stays yours to edit.</span>
            </span>
          </label>
        </div>
      </section>

      <section className="mt-6" aria-labelledby="deck-cards">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-foreground pb-2">
          <div>
            <h2 id="deck-cards" className="text-lg font-semibold tracking-tight text-foreground">Cards</h2>
            <p className="text-sm tabular-nums text-muted-foreground">{filled} complete · {cards.length} of {MAX_CARDS} rows</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={csvInputRef} type="file" accept=".csv,.tsv,text/csv" onChange={importCsv} className="hidden" aria-hidden="true" tabIndex={-1} />
            <Button size="sm" variant="outline" onClick={() => csvInputRef.current?.click()}><Upload className="h-3.5 w-3.5" aria-hidden="true" /> Import CSV</Button>
            <Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-3.5 w-3.5" aria-hidden="true" /> Export CSV</Button>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          CSV files need two columns, term and definition. Write math between dollar signs, for example <code className="bg-muted px-1">$x^2 + 1$</code>.
        </p>

        <ol className="mt-4 space-y-3">
          {cards.map((c, i) => {
            const incomplete = Boolean(c.term.trim()) !== Boolean(c.definition.trim());
            const n = i + 1;
            return (
              <li key={c.clientKey} className={`border bg-card ${incomplete ? 'border-destructive/60' : 'border-border'}`}>
                <div className="flex items-center justify-between border-b border-border px-4 py-1.5">
                  <span className="text-sm font-semibold tabular-nums text-muted-foreground">{String(n).padStart(2, '0')}</span>
                  <Button aria-label={`Delete card ${n}`} size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => removeCard(i)} disabled={cards.length === 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
                  <div className="space-y-1.5">
                    <Label htmlFor={`card-term-${c.clientKey}`}>Term</Label>
                    <Input id={`card-term-${c.clientKey}`} value={c.term} onChange={(e) => updateCard(i, 'term', e.target.value)} maxLength={500} aria-invalid={incomplete && !c.term.trim() ? true : undefined} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`card-def-${c.clientKey}`}>Definition</Label>
                    <Textarea id={`card-def-${c.clientKey}`} value={c.definition} onChange={(e) => updateCard(i, 'definition', e.target.value)} rows={2} maxLength={2000} className="min-h-10 resize-y" aria-invalid={incomplete && !c.definition.trim() ? true : undefined} />
                  </div>
                  <div className="space-y-1.5">
                    <span className="block text-sm font-medium text-foreground" id={`card-img-label-${c.clientKey}`}>Image</span>
                    <div className="flex items-center gap-2 sm:flex-col sm:items-stretch">
                      <label
                        htmlFor={`card-img-${c.clientKey}`}
                        className="relative grid h-16 w-24 cursor-pointer place-items-center overflow-hidden border border-dashed border-input bg-muted/30 text-muted-foreground hover:border-foreground hover:text-foreground focus-within:ring-2 focus-within:ring-ring/40"
                      >
                        {uploadingKey === c.clientKey ? (
                          <span className="text-xs">Uploading…</span>
                        ) : c.imageUrl ? (
                          <img src={c.imageUrl} alt={`Image for card ${n}`} className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex flex-col items-center gap-1 text-xs"><ImagePlus className="h-4 w-4" aria-hidden="true" /> Add</span>
                        )}
                        <input
                          id={`card-img-${c.clientKey}`}
                          type="file"
                          accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
                          className="sr-only"
                          aria-label={c.imageUrl ? `Replace image for card ${n}` : `Add an image to card ${n}`}
                          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) uploadCardImage(c.clientKey, f); }}
                        />
                      </label>
                      {c.imageUrl && (
                        <button type="button" onClick={() => { discardUnusedImage(c.imageUrl); setCardImage(c.clientKey, null); }} className="inline-flex min-h-9 items-center gap-1 text-sm text-muted-foreground hover:text-destructive">
                          <X className="h-3.5 w-3.5" aria-hidden="true" /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {incomplete && <p className="border-t border-destructive/30 px-4 py-2 text-sm text-destructive">Card {n} needs both a term and a definition.</p>}
              </li>
            );
          })}
        </ol>
        <button
          type="button"
          onClick={addCard}
          className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 border border-dashed border-input bg-card text-sm font-semibold text-foreground hover:border-foreground"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Add card
        </button>
      </section>

      <div className="sticky bottom-0 z-20 mr-14 mt-8 border border-foreground bg-card md:mr-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <p className="text-sm text-muted-foreground tabular-nums">{filled} card{filled === 1 ? '' : 's'} ready{classIds.length ? ` · ${classIds.length} class${classIds.length === 1 ? '' : 'es'}` : ' · not assigned'}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/flashcards')}>Cancel</Button>
            <Button onClick={save} disabled={saving || !!uploadingKey}>
              <Save className="h-4 w-4" aria-hidden="true" /> {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create deck'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
