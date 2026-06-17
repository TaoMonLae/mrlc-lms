import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, BookUp, BookDown, BookMarked } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface BookLoan {
  id: string;
  borrowerName: string;
  borrowerType?: string | null;
  status: 'BORROWED' | 'RETURNED' | 'OVERDUE';
  borrowedDate: string;
  dueDate: string;
  returnedDate?: string | null;
  notes?: string | null;
}

interface Book {
  id: string;
  title: string;
  author?: string | null;
  isbn?: string | null;
  publisher?: string | null;
  publishedYear?: number | null;
  category?: string | null;
  language?: string | null;
  edition?: string | null;
  shelfLocation?: string | null;
  description?: string | null;
  totalCopies: number;
  availableCopies: number;
  loans: BookLoan[];
}

function fmt(date?: string | null) {
  if (!date) return '—';
  try {
    return format(new Date(date), 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

const detailRows: { key: keyof Book; label: string }[] = [
  { key: 'author', label: 'Author' },
  { key: 'isbn', label: 'ISBN' },
  { key: 'publisher', label: 'Publisher' },
  { key: 'publishedYear', label: 'Published Year' },
  { key: 'category', label: 'Category' },
  { key: 'language', label: 'Language' },
  { key: 'edition', label: 'Edition' },
  { key: 'shelfLocation', label: 'Shelf Location' },
];

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const defaultDue = format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerType, setBorrowerType] = useState('STUDENT');
  const [dueDate, setDueDate] = useState(defaultDue);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/books/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Book not found');
      setBook(await res.json());
    } catch (error: any) {
      toast.error(error.message || 'Failed to load book');
      navigate('/books');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCheckout = async () => {
    if (!borrowerName.trim()) {
      toast.error('Borrower name is required');
      return;
    }
    if (!dueDate) {
      toast.error('Due date is required');
      return;
    }
    setSubmitting(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/books/${id}/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ borrowerName, borrowerType, dueDate, notes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to check out book');
      }
      toast.success(`Checked out to ${borrowerName}.`);
      setCheckoutOpen(false);
      setBorrowerName('');
      setNotes('');
      setDueDate(defaultDue);
      await load();
    } catch (error: any) {
      toast.error(error.message || 'Failed to check out book');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async (loanId: string) => {
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/book-loans/${loanId}/return`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to mark as returned');
      }
      toast.success('Book marked as returned.');
      await load();
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark as returned');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Remove this book from the catalog? This cannot be undone.')) return;
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/books/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete book');
      }
      toast.success('Book removed from catalog.');
      navigate('/books');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete book');
    }
  };

  if (loading || !book) {
    return <div className="flex items-center justify-center py-20 text-sm text-slate-500">Loading book…</div>;
  }

  const statusVariant = (s: BookLoan['status']) =>
    s === 'RETURNED' ? 'secondary' : s === 'OVERDUE' ? 'destructive' : 'default';

  return (
    <div className="space-y-6 max-w-[900px] mx-auto pb-10">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          render={<Link to="/books" />}
          nativeButton={false}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Book Catalog
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <BookMarked className="h-6 w-6 text-aubergine-600" /> {book.title}
            </h1>
            <div className="mt-2">
              <Badge variant={book.availableCopies > 0 ? 'default' : 'secondary'}>
                {book.availableCopies} / {book.totalCopies} available
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={book.availableCopies < 1}
              onClick={() => setCheckoutOpen(true)}
            >
              <BookUp className="mr-2 h-4 w-4" /> Check Out
            </Button>
            <Button variant="outline" render={<Link to={`/books/${id}/edit`} />} nativeButton={false}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {detailRows.map((row) => (
            <div key={row.key} className="flex justify-between gap-4 border-b border-slate-100 dark:border-surface-raised pb-2">
              <dt className="text-sm text-slate-500">{row.label}</dt>
              <dd className="text-sm font-medium text-slate-900 dark:text-white text-right">
                {book[row.key] != null && book[row.key] !== '' ? String(book[row.key]) : '—'}
              </dd>
            </div>
          ))}
        </dl>
        {book.description && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-surface-raised">
            <p className="text-sm text-slate-500 mb-1">Description / Notes</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{book.description}</p>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-surface-raised">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Borrowing History</h2>
        </div>
        {book.loans.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">No borrowing records yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Borrower</TableHead>
                <TableHead>Borrowed</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Returned</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {book.loans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell className="font-medium text-slate-900 dark:text-white">
                    {loan.borrowerName}
                    {loan.borrowerType && <span className="ml-1 text-xs text-slate-400">({loan.borrowerType})</span>}
                  </TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-300">{fmt(loan.borrowedDate)}</TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-300">{fmt(loan.dueDate)}</TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-300">{fmt(loan.returnedDate)}</TableCell>
                  <TableCell><Badge variant={statusVariant(loan.status)}>{loan.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    {loan.status !== 'RETURNED' ? (
                      <Button size="sm" variant="outline" onClick={() => handleReturn(loan.id)}>
                        <BookDown className="mr-2 h-4 w-4" /> Return
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check Out Book</DialogTitle>
            <DialogDescription>Issue a copy of “{book.title}” to a borrower.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="borrowerName">Borrower Name *</Label>
              <Input id="borrowerName" value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="borrowerType">Borrower Type</Label>
                <select
                  id="borrowerType"
                  value={borrowerType}
                  onChange={(e) => setBorrowerType(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 dark:border-surface-raised bg-transparent px-3 text-sm"
                >
                  <option value="STUDENT">Student</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="STAFF">Staff</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="loanNotes">Notes</Label>
              <Textarea id="loanNotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Cancel</Button>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleCheckout} disabled={submitting}>
              {submitting ? 'Issuing…' : 'Confirm Check Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
