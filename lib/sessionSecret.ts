const MINIMUM_SESSION_SECRET_LENGTH = 16;
const MINIMUM_DISTINCT_CHARACTERS = 8;
const PLACEHOLDER_MARKERS = [
  'change-me',
  'changeme',
  'replace-with',
  'replace-me',
  'your-secret',
  'random-string',
  'random-secret',
  'min-16-chars',
];

export const SESSION_SECRET_HINT = 'Generate one with: openssl rand -base64 48';

function normalizeForPlaceholderMatch(secret: string): string {
  return secret.toLowerCase().replace(/[\s_]+/g, '-');
}

export function sessionSecretProblem(secret: string | undefined): string | null {
  if (!secret || !secret.trim()) return 'SESSION_SECRET must be set.';
  if (secret.trim().length < MINIMUM_SESSION_SECRET_LENGTH) {
    return `SESSION_SECRET must be at least ${MINIMUM_SESSION_SECRET_LENGTH} characters long.`;
  }
  const normalized = normalizeForPlaceholderMatch(secret);
  if (PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker))) {
    return 'SESSION_SECRET is still a placeholder value from the example configuration.';
  }
  if (new Set(secret).size < MINIMUM_DISTINCT_CHARACTERS) {
    return 'SESSION_SECRET is too repetitive to be a random secret.';
  }
  return null;
}
