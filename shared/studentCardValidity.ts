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
