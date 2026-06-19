#!/usr/bin/env node
/**
 * Smoke test for the MRLC LMS API.
 *
 * Exercises auth, the core list endpoints, the full e-book lifecycle
 * (upload → fetch → stream → download permission → delete), and a couple of
 * validation/authorization guards against a *running, seeded* server.
 *
 * Usage:
 *   # start the server first (npm run dev), seed the DB (npm run seed), then:
 *   node scripts/smoke-test.mjs
 *
 * Config via env:
 *   BASE_URL         default http://localhost:8000
 *   SMOKE_EMAIL      default admin@mrlc.edu
 *   SMOKE_PASSWORD   default admin123   (matches the demo seed)
 *
 * Requires Node 18+ (global fetch / FormData / Blob). Exits non-zero on failure.
 */

const BASE = (process.env.BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
const EMAIL = process.env.SMOKE_EMAIL || 'admin@mrlc.edu';
const PASSWORD = process.env.SMOKE_PASSWORD || 'admin123';

let pass = 0;
let fail = 0;
let token = '';

function ok(name) { pass++; console.log(`  ✓ ${name}`); }
function bad(name, detail) { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }

async function req(method, path, { body, headers, raw } = {}) {
  const h = { ...(headers || {}) };
  if (token && h.Authorization === undefined) h.Authorization = `Bearer ${token}`;
  let payload = body;
  if (body && !raw && !(body instanceof FormData)) {
    h['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers: h, body: payload });
  return res;
}

async function expectStatus(name, method, path, expected, opts) {
  try {
    const res = await req(method, path, opts);
    const list = Array.isArray(expected) ? expected : [expected];
    if (list.includes(res.status)) ok(`${name} (${res.status})`);
    else bad(name, `expected ${list.join('/')}, got ${res.status}`);
    return res;
  } catch (e) {
    bad(name, e.message);
    return null;
  }
}

function tinyPdf() {
  // Minimal bytes with a %PDF header — enough for upload/stream/delete.
  return new Blob([`%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF`], {
    type: 'application/pdf',
  });
}

async function main() {
  console.log(`\nMRLC LMS smoke test → ${BASE}\n`);

  // ── Auth ──
  console.log('Auth');
  const reachable = await fetch(`${BASE}/api/health`).catch(() => null);
  if (!reachable) {
    console.error(`\nCannot reach ${BASE}. Is the server running?\n`);
    process.exit(2);
  }
  const loginRes = await req('POST', '/api/auth/login', { body: { email: EMAIL, password: PASSWORD } });
  if (!loginRes.ok) {
    bad('login', `${loginRes.status} — check SMOKE_EMAIL/SMOKE_PASSWORD`);
    summary();
    return;
  }
  const loginData = await loginRes.json();
  token = loginData.token;
  ok('login');
  await expectStatus('GET /api/auth/me', 'GET', '/api/auth/me', 200);
  await expectStatus('reject /api/students without token', 'GET', '/api/students', 401, { headers: { Authorization: '' } });

  // ── Core list endpoints ──
  console.log('\nCore endpoints');
  const lists = [
    '/api/students', '/api/teachers', '/api/classes', '/api/subjects',
    '/api/exams', '/api/library', '/api/videos', '/api/books',
    '/api/fees', '/api/cases', '/api/users', '/api/audit-logs',
    '/api/settings', '/api/ebooks',
  ];
  for (const p of lists) await expectStatus(`GET ${p}`, 'GET', p, 200);

  // ── Validation guard ──
  console.log('\nValidation');
  await expectStatus('POST /api/books without title → 400', 'POST', '/api/books', 400, { body: { author: 'No Title' } });

  // ── E-book lifecycle ──
  console.log('\nE-Library lifecycle');
  const fd = new FormData();
  fd.append('file', tinyPdf(), 'smoke-test.pdf');
  fd.append('title', 'Smoke Test Book');
  fd.append('downloadAllowed', 'false');
  fd.append('visibility', 'ALL');
  const up = await req('POST', '/api/ebooks', { body: fd });
  if (up.status === 201) {
    const book = await up.json();
    ok('upload e-book (201)');
    await expectStatus('GET e-book metadata', 'GET', `/api/ebooks/${book.id}`, 200);
    await expectStatus('stream e-book content', 'GET', `/api/ebooks/${book.id}/content`, 200);
    // downloadAllowed=false → admins may still download, so accept 200 or 403.
    await expectStatus('download respects permission', 'GET', `/api/ebooks/${book.id}/download`, [200, 403]);
    await expectStatus('delete e-book', 'DELETE', `/api/ebooks/${book.id}`, 200);
  } else {
    bad('upload e-book', `got ${up.status} (is the Ebook table migrated?)`);
  }

  summary();
}

function summary() {
  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
