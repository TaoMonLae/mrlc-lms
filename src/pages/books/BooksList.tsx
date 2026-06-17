import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, BookMarked, Library } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Book {
  id: string;
  title: string;
  author?: string | null;
  isbn?: string | null;
  category?: string | null;
  shelfLocation?: string | null;
  totalCopies: number;
  availableCopies: number;
}

export default function BooksList() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch('/api/books', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load books');
        setBooks(await res.json());
      } catch (error: any) {
        toast.error(error.message || 'Failed to load books');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return books;
    return books.filter((b) =>
      [b.title, b.author, b.isbn, b.category, b.shelfLocation]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [books, query]);

  const totals = useMemo(() => {
    const titles = books.length;
    const copies = books.reduce((sum, b) => sum + (b.totalCopies || 0), 0);
    const available = books.reduce((sum, b) => sum + (b.availableCopies || 0), 0);
    return { titles, copies, available, onLoan: copies - available };
  }, [books]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BookMarked className="h-6 w-6 text-aubergine-600" /> Book Catalog
          </h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">
            Physical books held by the library. Add titles, track copies, and manage borrowing.
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          render={<Link to="/books/new" />}
          nativeButton={false}
        >
          <Plus className="mr-2 h-4 w-4" /> Add Book
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Titles', value: totals.titles },
          { label: 'Total Copies', value: totals.copies },
          { label: 'Available', value: totals.available },
          { label: 'On Loan', value: totals.onLoan },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, author, ISBN, category…"
          className="pl-9"
        />
      </div>

      <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">Loading catalog…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Library className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {books.length === 0 ? 'No books in the catalog yet.' : 'No books match your search.'}
            </p>
            {books.length === 0 && (
              <p className="text-xs text-slate-500 mt-1">Click “Add Book” to enter your first title.</p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden lg:table-cell">Shelf</TableHead>
                <TableHead className="text-right">Availability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((b) => (
                <TableRow
                  key={b.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/books/${b.id}`)}
                >
                  <TableCell className="font-medium text-slate-900 dark:text-white">{b.title}</TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-300">{b.author || '—'}</TableCell>
                  <TableCell className="hidden md:table-cell text-slate-600 dark:text-slate-300">{b.category || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-slate-600 dark:text-slate-300">{b.shelfLocation || '—'}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={b.availableCopies > 0 ? 'default' : 'secondary'}>
                      {b.availableCopies} / {b.totalCopies} available
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
