import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const dbUrl = process.env.EXAM_ACCESS_TEST_DATABASE_URL;
const base = process.env.EXAM_ACCESS_TEST_BASE_URL;
const secret = process.env.EXAM_ACCESS_TEST_SECRET;
const enabled = dbUrl && new URL(dbUrl).hostname === '127.0.0.1' && new URL(dbUrl).port === '55489' && base === 'http://127.0.0.1:5891' && secret;

test('exam editing is granted and revoked by the owner in the same class', { skip: !enabled }, async () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: dbUrl! }) });
  const people: string[] = [];
  const exams: string[] = [];
  let subjectId = '', classId = '';
  try {
    for (let i = 0; i < 4; i++) {
      const u = await db.user.create({ data: { role: 'TEACHER', email: randomUUID()+'@example.test', firstName: 'Teacher', lastName: String(i) } });
      people.push(u.id);
    }
    const request = (person: number, path: string, method = 'GET', body?: object) => fetch(base + path, {
      method, headers: { Authorization: 'Bearer '+jwt.sign({ userId: people[person], role: 'TEACHER', email: 'test@example.test' }, secret!, { expiresIn: '5m' }), 'Content-Type': 'application/json' },
      body: body && JSON.stringify(body),
    });
    async function check(person: number, path: string, method: string, status: number, body?: object) {
      const res = await request(person, path, method, body);
      assert.equal(res.status, status, method+' '+path+' '+await res.clone().text());
      return res;
    }
    classId = (await db.class.create({ data: { name: 'Exam test', level: 'GED', academicYear: '2026' } })).id;
    subjectId = (await db.subject.create({ data: { name: 'Test subject', code: randomUUID() } })).id;
    for (const id of people.slice(0, 3)) {
      const teacher = await db.teacher.create({ data: { userId: id, teacherCode: randomUUID() } });
      await db.classTeacher.create({ data: { teacherId: teacher.id, classId } });
    }
    const draft = { classId, subjectId, title: 'Access test', status: 'DRAFT' };
    const created = await check(0, '/api/exams', 'POST', 201, { ...draft, ownerId: people[1], editorIds: [people[1]] });
    const { id } = await created.json();
    exams.push(id);
    const path = '/api/exams/'+id;
    assert.equal((await (await check(0, path+'/access', 'GET', 200)).json()).access, 'owner');
    assert.equal((await (await check(1, path+'/access', 'GET', 200)).json()).access, 'viewer');
    for (const list of ['/api/exams', '/api/teacher/exams']) {
      const rows = await (await check(1, list, 'GET', 200)).json();
      assert.equal(rows.find((r: { id: string }) => r.id === id)?.access, 'viewer');
    }
    await check(1, path+'/preview', 'GET', 200);
    await check(3, path+'/preview', 'GET', 403);
    const grant = (i: number, allowed: boolean) => ({ teacherUserId: people[i], allowed });
    await check(1, path, 'PUT', 403, draft);
    await check(1, path+'/editors', 'PUT', 403, grant(1,true));
    await check(0, path+'/editors', 'PUT', 400, grant(3,true));
    await Promise.all([1,2].map(i => check(0, path+'/editors', 'PUT', 200, grant(i,true))));
    assert.equal((await (await check(0, path+'/editors', 'GET', 200)).json()).filter((r: { allowed: boolean }) => r.allowed).length, 2);
    await check(1, path, 'PUT', 200, { ...draft, title: 'Edited by invitation' });
    await check(1, path+'/editors', 'PUT', 403, grant(2,false));
    await check(0, path+'/editors', 'PUT', 200, grant(1,false));
    await check(1, path+'/schedule', 'PUT', 403, { durationMinutes: 99 });
    await check(1, path, 'DELETE', 403);
    await check(1, path+'/results', 'GET', 403);
    await check(1, path+'/preview', 'GET', 200);
    assert.equal((await db.exam.findUniqueOrThrow({ where: { id } })).title, 'Edited by invitation');
  } finally {
    await db.exam.deleteMany({ where: { id: { in: exams } } });
    if (classId) { await db.classTeacher.deleteMany({ where: { classId } }); await db.class.delete({ where: { id: classId } }); }
    if (subjectId) await db.subject.delete({ where: { id: subjectId } });
    await db.teacher.deleteMany({ where: { userId: { in: people } } });
    await db.user.deleteMany({ where: { id: { in: people } } });
    await db.$disconnect();
  }
});
