const ACADEMIC_YEAR_PATTERN = /\b(20\d{2})(?:\s*[-\/]\s*(20\d{2}))?\b/;

/**
 * Student cards remain valid through the next academic-year boundary. When a
 * class has a range such as 2026-2027, the range end is used. Stale or missing
 * class data never creates a card that is already expired.
 */
export function inferStudentCardExpiry(
  academicYear: string | null | undefined,
  issueDate: Date,
): Date {
  const match = academicYear?.match(ACADEMIC_YEAR_PATTERN);
  const statedEndYear = match ? Number(match[2] || match[1]) : issueDate.getUTCFullYear();
  // 15:59:59.999 UTC is 23:59:59.999 in the school timezone (Asia/Kuala_Lumpur).
  let expiry = new Date(Date.UTC(statedEndYear, 6, 31, 15, 59, 59, 999));

  if (expiry.getTime() <= issueDate.getTime()) {
    expiry = new Date(Date.UTC(issueDate.getUTCFullYear() + 1, 6, 31, 15, 59, 59, 999));
  }
  return expiry;
}

/**
 * Shared "is this personnel card still good" check for teacher/staff ID
 * cards, used by every place that renders a status (the public verify JSON,
 * the on-screen card, and the printable PDF) so they can't drift out of sync
 * the way the PDF export once did — it passed the raw ACTIVE/INACTIVE holder
 * status straight through, so an expired-but-still-employed holder's card
 * printed a green "ACTIVE" badge instead of "EXPIRED".
 *
 * A missing expiry date is treated as expired (fail closed) rather than
 * valid, since a card with no known expiry can't be confirmed current.
 */
export function personnelCardStatus(
  holderStatus: string,
  expiryDate: Date | string | null | undefined,
): 'ACTIVE' | 'INACTIVE' | 'EXPIRED' {
  if (holderStatus !== 'ACTIVE') return 'INACTIVE';
  const expired = !expiryDate || new Date(expiryDate).getTime() < Date.now();
  return expired ? 'EXPIRED' : 'ACTIVE';
}
