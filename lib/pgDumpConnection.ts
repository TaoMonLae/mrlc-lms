/** Convert a Prisma PostgreSQL URL into a libpq URL accepted by pg_dump. */
export function pgDumpConnection(databaseUrl: string): { url: string; password?: string } {
  const url = new URL(databaseUrl);
  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    throw new Error('Database backups require a PostgreSQL connection URL');
  }

  // Prisma understands this parameter, but libpq rejects it. pg_dump backs up
  // the database, including its schemas, without it.
  url.searchParams.delete('schema');

  // Keep the password out of the process argument list. pg_dump reads it from
  // PGPASSWORD in its child environment instead.
  const password = url.password ? decodeURIComponent(url.password) : undefined;
  url.password = '';
  return { url: url.toString(), password };
}
