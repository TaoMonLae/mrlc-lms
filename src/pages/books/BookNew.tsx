import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import BookForm, { BookFormValues } from './BookForm';

export default function BookNew() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: BookFormValues) => {
    setSubmitting(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to add book');
      }
      toast.success('Book added to the catalog.');
      navigate('/books');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add book');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[820px] mx-auto pb-10">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          render={<Link to="/books" />}
          nativeButton={false}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Book Catalog
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Add Book</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">
          Enter the details of a physical book to add it to the library catalog.
        </p>
      </div>

      <BookForm submitting={submitting} submitLabel="Save Book" onSubmit={handleSubmit} onCancel={() => navigate('/books')} />
    </div>
  );
}
