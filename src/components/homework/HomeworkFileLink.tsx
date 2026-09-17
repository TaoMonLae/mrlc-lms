import { useState, type AnchorHTMLAttributes } from 'react';
import { toast } from 'sonner';
import { downloadAuthenticatedFile } from '../../lib/api';

/** External learning resources stay links; private coursework downloads never expose tokens. */
export function HomeworkFileLink({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const [busy, setBusy] = useState(false);
  if (!href?.startsWith('/uploads/homework-media/')) return <a href={href} {...props}>{children}</a>;
  return <a href={href} {...props} aria-busy={busy} onClick={async event => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try { await downloadAuthenticatedFile(href, String(props.download || href.split('/').pop() || 'Homework file')); }
    catch (error: any) { toast.error(error.message || 'Could not download file'); }
    finally { setBusy(false); }
  }}>{children}</a>;
}
