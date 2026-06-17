import React, { useState } from 'react';

export interface BookFormValues {
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  publishedYear: string;
  category: string;
  language: string;
  edition: string;
  shelfLocation: string;
  description: string;
  coverUrl: string;
  totalCopies: string;
}

const EMPTY: BookFormValues = {
  title: '',
  author: '',
  isbn: '',
  publisher: '',
  publishedYear: '',
  category: '',
  language: '',
  edition: '',
  shelfLocation: '',
  description: '',
  coverUrl: '',
  totalCopies: '1',
};

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';

interface BookFormProps {
  initial?: Partial<BookFormValues>;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: BookFormValues) => void;
  onCancel: () => void;
}

const inputClass = 'space-y-2';
const labelText = 'text-sm font-medium text-slate-700 dark:text-slate-300';

export default function BookForm({ initial, submitting, submitLabel = 'Save Book', onSubmit, onCancel }: BookFormProps) {
  const [values, setValues] = useState<BookFormValues>({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState<Partial<Record<keyof BookFormValues, string>>>({});

  const set = (key: keyof BookFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const validate = (): boolean => {
    const next: Partial<Record<keyof BookFormValues, string>> = {};
    if (!values.title.trim() || values.title.trim().length < 2) {
      next.title = 'Title is required (at least 2 characters)';
    }
    const copies = parseInt(values.totalCopies, 10);
    if (isNaN(copies) || copies < 1) {
      next.totalCopies = 'Enter at least 1 copy';
    }
    if (values.publishedYear) {
      const yr = parseInt(values.publishedYear, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(yr) || yr < 0 || yr > currentYear + 1) {
        next.publishedYear = `Enter a valid year (up to ${currentYear + 1})`;
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm space-y-6">
        <div className={inputClass}>
          <Label htmlFor="title" className={labelText}>Title *</Label>
          <Input id="title" value={values.title} onChange={set('title')} placeholder="e.g. A Brief History of Time" />
          {errors.title && <p className="text-xs text-red-500 font-medium">{errors.title}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={inputClass}>
            <Label htmlFor="author" className={labelText}>Author</Label>
            <Input id="author" value={values.author} onChange={set('author')} placeholder="e.g. Stephen Hawking" />
          </div>
          <div className={inputClass}>
            <Label htmlFor="isbn" className={labelText}>ISBN</Label>
            <Input id="isbn" value={values.isbn} onChange={set('isbn')} placeholder="e.g. 978-0-553-10953-5" />
          </div>
          <div className={inputClass}>
            <Label htmlFor="publisher" className={labelText}>Publisher</Label>
            <Input id="publisher" value={values.publisher} onChange={set('publisher')} placeholder="e.g. Bantam Books" />
          </div>
          <div className={inputClass}>
            <Label htmlFor="publishedYear" className={labelText}>Published Year</Label>
            <Input id="publishedYear" type="number" value={values.publishedYear} onChange={set('publishedYear')} placeholder="e.g. 1988" />
            {errors.publishedYear && <p className="text-xs text-red-500 font-medium">{errors.publishedYear}</p>}
          </div>
          <div className={inputClass}>
            <Label htmlFor="category" className={labelText}>Category / Genre</Label>
            <Input id="category" value={values.category} onChange={set('category')} placeholder="e.g. Science, Fiction, Reference" />
          </div>
          <div className={inputClass}>
            <Label htmlFor="language" className={labelText}>Language</Label>
            <Input id="language" value={values.language} onChange={set('language')} placeholder="e.g. English, Burmese, Mon" />
          </div>
          <div className={inputClass}>
            <Label htmlFor="edition" className={labelText}>Edition</Label>
            <Input id="edition" value={values.edition} onChange={set('edition')} placeholder="e.g. 2nd Edition" />
          </div>
          <div className={inputClass}>
            <Label htmlFor="shelfLocation" className={labelText}>Shelf Location</Label>
            <Input id="shelfLocation" value={values.shelfLocation} onChange={set('shelfLocation')} placeholder="e.g. A-12 / Reference Shelf 3" />
          </div>
          <div className={inputClass}>
            <Label htmlFor="totalCopies" className={labelText}>Total Copies *</Label>
            <Input id="totalCopies" type="number" min={1} value={values.totalCopies} onChange={set('totalCopies')} placeholder="1" />
            {errors.totalCopies && <p className="text-xs text-red-500 font-medium">{errors.totalCopies}</p>}
          </div>
          <div className={inputClass}>
            <Label htmlFor="coverUrl" className={labelText}>Cover Image URL</Label>
            <Input id="coverUrl" value={values.coverUrl} onChange={set('coverUrl')} placeholder="https://..." />
          </div>
        </div>

        <div className={inputClass}>
          <Label htmlFor="description" className={labelText}>Description / Notes</Label>
          <Textarea id="description" value={values.description} onChange={set('description')} rows={3} placeholder="Short summary, condition notes, donor, etc." />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button
          type="submit"
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          disabled={submitting}
        >
          {submitting ? 'Saving...' : (<><Save className="mr-2 h-4 w-4" />{submitLabel}</>)}
        </Button>
      </div>
    </form>
  );
}
