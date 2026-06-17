import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import BookForm, { BookFormValues } from './BookForm';

export default function BookEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initial, setInitial] = useState<Partial<BookFormValues> | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch(`/api/books/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Book not found');
        const b = await res.json();
        setInitial({
          title: b.title ?? '',
          author: b.author ?? '',
          isbn: b.isbn ?? '',
          publisher: b.publisher ?? '',
          publishedYear: b.publishedYear != null ? String(b.publishedYear) : '',
          category: b.category ?? '',
          language: b.language ?? '',
          edition: b.edition ?? '',
          shelfLocation: b.shelfLocation ?? '',
          description: b.description ?? '',
          coverUrl: b.coverUrl ?? '',
          totalCopies: b.totalCopies != null ? String(b.totalCopies) : '1',
        });
      } catch (error: any) {
        toast.error(error.message || 'Failed to load book');
        navigate('/books');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const handleSubmit = async (values: BookFormValues) => {
    setSubmitting(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/books/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update book');
      }
      toast.success('Book updated.');
      navigate(`/books/${id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update book');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !initial) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-slate-500">Loading book…</div>
    );
  }

  return (
    <div className="space-y-6 max-w-[820px] mx-auto pb-10">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          render={<Link to={`/books/${id}`} />}
          nativeButton={false}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Edit Book</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Update this book's catalog details.</p>
      </div>

      <BookForm initial={initial} submitting={submitting} submitLabel="Save Changes" onSubmit={handleSubmit} onCancel={() => navigate(`/books/${id}`)} />
    </div>
  );
}
