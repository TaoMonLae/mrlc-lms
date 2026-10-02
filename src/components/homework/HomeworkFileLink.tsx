import { useState, type AnchorHTMLAttributes } from 'react';
import { toast } from 'sonner';
import { Link } from 'react-router';
import { downloadAuthenticatedFile } from '../../lib/api';

/** Keep internal learning resources in the signed-in tab (auth uses sessionStorage).
 * External resources stay links; private coursework downloads never expose tokens.
 */
export function HomeworkFileLink({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const [busy, setBusy] = useState(false);
  let resourcePath: string | null = null;
  if (href) {
    try {
      const url = new URL(href, window.location.origin);
      if (url.origin === window.location.origin && /^\/(?:elibrary|news)(?:\/|$)/.test(url.pathname)) {
        resourcePath = `${url.pathname}${url.search}${url.hash}`;
      }
    } catch { /* Leave invalid URLs to the existing link handling. */ }
  }
  if (resourcePath) return <Link {...props} to={resourcePath} target="_self">{children}</Link>;
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
