import React, { useState } from 'react';
import Papa from 'papaparse';
import { Check, Copy, Download, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface TemporaryCredential {
  name: string;
  email: string;
  temporaryPassword: string;
}

interface TemporaryCredentialsDialogProps {
  credentials: TemporaryCredential[];
  accountLabel: string;
  onDone: () => void;
}

async function copyText(value: string, onCopied: () => void) {
  try {
    await navigator.clipboard.writeText(value);
    onCopied();
  } catch {
    toast.error('Could not copy. Select the text and copy it manually.');
  }
}

function CopyableValue({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
        <code className="min-w-0 flex-1 truncate font-mono text-sm text-foreground select-all">{value}</code>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Copy ${label.toLowerCase()}`}
          onClick={() => copyText(value, () => setCopied(true))}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function downloadCredentials(credentials: TemporaryCredential[], accountLabel: string) {
  const csv = Papa.unparse({
    fields: ['name', 'email', 'temporaryPassword'],
    data: credentials.map((entry) => [entry.name, entry.email, entry.temporaryPassword]),
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${accountLabel}-temporary-passwords.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function TemporaryCredentialsTable({ credentials }: { credentials: TemporaryCredential[] }) {
  return (
    <div className="max-h-72 overflow-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Email</th>
            <th className="px-3 py-2 font-medium">Temporary password</th>
          </tr>
        </thead>
        <tbody>
          {credentials.map((entry) => (
            <tr key={entry.email} className="border-t border-border">
              <td className="px-3 py-2 text-foreground">{entry.name}</td>
              <td className="px-3 py-2 text-muted-foreground break-all">{entry.email}</td>
              <td className="px-3 py-2 font-mono text-foreground select-all">{entry.temporaryPassword}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TemporaryCredentialsPanel({ credentials, accountLabel }: { credentials: TemporaryCredential[]; accountLabel: string }) {
  if (credentials.length === 0) return null;
  return (
    <div className="space-y-2 rounded-lg border border-aubergine-200 bg-aubergine-50/40 p-3 dark:border-aubergine-800 dark:bg-aubergine-900/10">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="text-sm">
          <p className="flex items-center gap-2 font-semibold text-foreground"><KeyRound className="h-4 w-4 text-aubergine-600" /> Temporary passwords</p>
          <p className="text-muted-foreground">Shown only once. Download or copy them now and give each one privately. Each {accountLabel} chooses a new password at first sign-in.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => downloadCredentials(credentials, accountLabel)}>
          <Download className="mr-2 h-4 w-4" /> Download CSV
        </Button>
      </div>
      <TemporaryCredentialsTable credentials={credentials} />
    </div>
  );
}

export function TemporaryCredentialsDialog({ credentials, accountLabel, onDone }: TemporaryCredentialsDialogProps) {
  const single = credentials.length === 1 ? credentials[0] : null;
  return (
    <Dialog open={credentials.length > 0} onOpenChange={(open) => { if (!open) onDone(); }}>
      <DialogContent className={single ? 'max-w-md' : 'max-w-2xl sm:max-w-2xl'} showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-aubergine-600" />
            Save the sign-in details
          </DialogTitle>
          <DialogDescription>
            {single
              ? `This temporary password is shown only once. Give it to the ${accountLabel} privately. They will choose a new password the first time they sign in.`
              : `These temporary passwords are shown only once. Download or copy them now and give each one privately. Every ${accountLabel} will choose a new password the first time they sign in.`}
          </DialogDescription>
        </DialogHeader>

        {single ? (
          <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-sm font-semibold text-foreground">{single.name}</p>
            <CopyableValue label="Email" value={single.email} />
            <CopyableValue label="Temporary password" value={single.temporaryPassword} />
          </div>
        ) : (
          <TemporaryCredentialsTable credentials={credentials} />
        )}

        <DialogFooter>
          {!single && (
            <Button type="button" variant="outline" onClick={() => downloadCredentials(credentials, accountLabel)}>
              <Download className="mr-2 h-4 w-4" /> Download CSV
            </Button>
          )}
          <Button type="button" onClick={onDone}>{single ? "I've saved it" : "I've saved them"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
