import assert from 'node:assert/strict';
import test from 'node:test';
import { pgDumpConnection } from '../../lib/pgDumpConnection';

test('pg_dump connection removes Prisma schema and keeps credentials out of arguments', () => {
  const result = pgDumpConnection('postgresql://mrlc:p%40ss%3Aword@localhost:5432/mrlc_lms?schema=public&sslmode=require');
  assert.equal(result.url, 'postgresql://mrlc@localhost:5432/mrlc_lms?sslmode=require');
  assert.equal(result.password, 'p@ss:word');
});

test('pg_dump connection accepts URLs without schema or password', () => {
  assert.deepEqual(pgDumpConnection('postgres://mrlc@localhost/mrlc_lms'), {
    url: 'postgres://mrlc@localhost/mrlc_lms',
    password: undefined,
  });
  assert.throws(() => pgDumpConnection('https://example.com/database'));
});
