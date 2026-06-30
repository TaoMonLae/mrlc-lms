#!/usr/bin/env node

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
    '/api/employees', '/api/departments', '/api/designations',
    '/api/payroll-runs', '/api/leave-types', '/api/leave-requests',
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

  // ── HR / Payroll / Leave lifecycle ──
  console.log('\nHR / Payroll / Leave lifecycle');
  // department → designation → employee → payroll run (auto-payslip) → payslip edit
  // → leave type → leave request → approve → balance.
  let hrOk = true;
  const depRes = await req('POST', '/api/departments', { body: { name: `Smoke Dept ${Date.now()}` } });
  if (depRes.status === 201) {
    ok('create department (201)');
    const dep = await depRes.json();
    const desRes = await req('POST', '/api/designations', { body: { title: 'Smoke Officer', departmentId: dep.id } });
    const des = desRes.status === 201 ? await desRes.json() : null;
    desRes.status === 201 ? ok('create designation (201)') : bad('create designation', `got ${desRes.status}`);

    const empRes = await req('POST', '/api/employees', {
      body: { firstName: 'Smoke', lastName: 'Staff', baseSalary: 1000, departmentId: dep.id, designationId: des?.id },
    });
    if (empRes.status === 201) {
      ok('create employee (201)');
      const emp = await empRes.json();

      const ym = { periodYear: 2999, periodMonth: 1 };
      const runRes = await req('POST', '/api/payroll-runs', { body: ym });
      if (runRes.status === 201) {
        ok('create payroll run (201)');
        const run = await runRes.json();
        const detRes = await req('GET', `/api/payroll-runs/${run.id}`);
        const detail = await detRes.json();
        const slip = (detail.payslips || []).find((p) => p.employeeId === emp.id);
        slip ? ok('payslip auto-seeded for active employee') : bad('payslip auto-seed', 'no payslip for new employee');
        if (slip) {
          const slipRes = await req('PUT', `/api/payslips/${slip.id}`, { body: { allowances: 200, deductions: 50 } });
          const updated = slipRes.status === 200 ? await slipRes.json() : null;
          (updated && updated.netPay === 1150)
            ? ok('payslip netPay recomputed (1000 + 200 − 50 = 1150)')
            : bad('payslip recompute', `expected 1150, got ${updated?.netPay}`);
        }
        // approve, then assert payslips lock
        await expectStatus('approve payroll run', 'PUT', `/api/payroll-runs/${run.id}/status`, 200, { body: { status: 'APPROVED' } });
        if (slip) await expectStatus('payslip edit blocked once APPROVED', 'PUT', `/api/payslips/${slip.id}`, 400, { body: { allowances: 1 } });
      } else if (runRes.status === 409) {
        ok('payroll run duplicate guard (409 — rerun)');
      } else { bad('create payroll run', `got ${runRes.status}`); hrOk = false; }

      const ltRes = await req('POST', '/api/leave-types', { body: { name: `Smoke Leave ${Date.now()}`, daysPerYear: 10 } });
      if (ltRes.status === 201) {
        ok('create leave type (201)');
        const lt = await ltRes.json();
        const year = new Date().getFullYear();
        const lrRes = await req('POST', '/api/leave-requests', {
          body: { employeeId: emp.id, leaveTypeId: lt.id, startDate: `${year}-06-01`, endDate: `${year}-06-03` },
        });
        if (lrRes.status === 201) {
          const lr = await lrRes.json();
          lr.days === 3 ? ok('leave request days computed (3)') : bad('leave days', `expected 3, got ${lr.days}`);
          await expectStatus('approve leave request', 'PUT', `/api/leave-requests/${lr.id}/status`, 200, { body: { status: 'APPROVED' } });
          const balRes = await req('GET', `/api/employees/${emp.id}/leave-balance`);
          const bal = await balRes.json();
          const row = (bal.balance || []).find((b) => b.leaveTypeId === lt.id);
          (row && row.used === 3 && row.remaining === 7)
            ? ok('leave balance reflects approval (used 3, remaining 7)')
            : bad('leave balance', `got used=${row?.used} remaining=${row?.remaining}`);
        } else { bad('create leave request', `got ${lrRes.status}`); }
      } else { bad('create leave type', `got ${ltRes.status}`); }

      // soft-delete employee (terminate)
      await expectStatus('terminate employee (soft delete)', 'DELETE', `/api/employees/${emp.id}`, 200);
    } else { bad('create employee', `got ${empRes.status}`); hrOk = false; }
  } else {
    bad('create department', `got ${depRes.status} (is the HR migration applied?)`);
    hrOk = false;
  }
  if (hrOk) ok('HR lifecycle completed');

  summary();
}

function summary() {
  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
