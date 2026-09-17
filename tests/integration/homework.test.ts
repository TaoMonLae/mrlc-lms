import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const url = process.env.HOMEWORK_TEST_DATABASE_URL;
const base = process.env.HOMEWORK_TEST_BASE_URL;
const secret = process.env.HOMEWORK_TEST_SESSION_SECRET;
const enabled = Boolean(url && new URL(url).hostname === '127.0.0.1' && new URL(url).port === '55439' && base && new URL(base).hostname === '127.0.0.1' && new URL(base).port === '5801' && secret);

test('homework ownership, private files, student hand-in and grading lifecycle', { skip: !enabled }, async t => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url! }) });
  const users: string[] = [], teachers: string[] = [], students: string[] = [], homework: string[] = [], uploaded: any[] = [], videos: string[] = [];
  let classId = '';
  const roles = ['ADMIN', 'TEACHER', 'TEACHER', 'STUDENT', 'STUDENT'] as const;
  const headers = (index: number) => ({ Authorization: `Bearer ${jwt.sign({ role: roles[index], userId: users[index], email: 'homework@example.test' }, secret!, { expiresIn: '15m' })}` });
  const request = (index: number, path: string, method = 'GET', body?: unknown) => fetch(`${base}${path}`, { method, headers: { ...headers(index), 'Content-Type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const ok = async (response: Response, status = 200) => { assert.equal(response.status, status, await response.clone().text()); return response.json(); };
  const upload = async (index: number, name: string, content = 'My homework answer') => {
    const body = new FormData(); body.append('file', new File([content], name, { type: 'text/plain' }));
    const file = await ok(await fetch(`${base}/api/homework-media`, { method: 'POST', headers: headers(index), body }), 201);
    uploaded.push({ ...file, owner: index }); return file;
  };
  try {
    for (const role of roles) users.push((await db.user.create({ data: { role, email: `${randomUUID()}@example.test`, firstName: role, lastName: 'Homework Test' } })).id);
    classId = (await db.class.create({ data: { name: 'Homework isolated test', level: 'GED', academicYear: '2026' } })).id;
    for (const index of [1, 2]) {
      const teacherId = (await db.teacher.create({ data: { userId: users[index], teacherCode: randomUUID() } })).id;
      teachers.push(teacherId); await db.classTeacher.create({ data: { classId, teacherId } });
    }
    for (const index of [3, 4]) students.push((await db.student.create({ data: { userId: users[index], studentCode: randomUUID(), classId } })).id);
    const worksheet = await upload(1, 'worksheet.txt');
    for (const index of [1, 2]) {
      const assignment = await ok(await request(index, '/api/homework', 'POST', { title: `${roles[index]} ${index} private assignment`, classId, dueDate: '2026-10-01', maxMarks: 10, ...(index === 1 ? { attachmentUrl: worksheet.url } : {}) }), 201);
      homework.push(assignment.id);
    }
    const path = `/api/homework/${homework[0]}`;
    await t.test('co-teachers see only their own homework and cannot use direct write URLs', async () => {
      assert.deepEqual((await ok(await request(1, `/api/homework?classId=${classId}`))).map((row: any) => row.id), [homework[0]]);
      assert.deepEqual((await ok(await request(2, `/api/homework?classId=${classId}`))).map((row: any) => row.id), [homework[1]]);
      assert.equal((await ok(await request(0, `/api/homework?classId=${classId}`))).length, 2);
      for (const [suffix, method, body] of [['', 'GET', undefined], ['', 'PUT', { title: 'Hijacked' }], ['', 'DELETE', undefined], ['/mark', 'POST', { studentId: students[0], status: 'MARKED', score: 5 }], ['/sync-gradebook', 'POST', undefined]] as const) assert.equal((await request(2, `${path}${suffix}`, method, body)).status, 403);
      const roster = await ok(await request(1, path));
      assert.equal(roster.class.students[0].medicalNotes, undefined);
      assert.ok(!Object.hasOwn(roster.class.students[0], 'dateOfBirth'));
    });
    await t.test('classwork and video catalogs cannot expose or attach co-teacher homework', async () => {
      const feed = await ok(await request(2, `/api/classwork/classes/${classId}`));
      assert.ok(!JSON.stringify(feed).includes(homework[0])); assert.ok(JSON.stringify(feed).includes(homework[1]));
      assert.equal((await request(2, `/api/classwork/classes/${classId}/placement`, 'PUT', { sourceType: 'HOMEWORK', sourceId: homework[0], pinned: true })).status, 404);
      const video = await db.videoLesson.create({ data: { title: 'Homework integration test', videoUrl: 'https://youtu.be/-mzqQ_vNiKg', classId, uploadedById: users[2], uploadedByName: 'Co teacher', status: 'PUBLISHED', visibility: 'STUDENTS' } }); videos.push(video.id);
      const options = await ok(await request(2, `/api/videos/${video.id}/learning/options`)); assert.deepEqual(options.homeworks.map((row: any) => row.id), [homework[1]]);
      assert.equal((await request(2, `/api/videos/${video.id}/learning`, 'PUT', { homeworkId: homework[0] })).status, 400);
      await ok(await request(0, `/api/videos/${video.id}/learning`, 'PUT', { homeworkId: homework[0] }));
      const learning = await ok(await request(2, `/api/videos/${video.id}/learning`)); assert.equal(learning.homework, null); assert.equal(learning.homeworkId, null);
      assert.ok((await ok(await request(2, `/api/videos/${video.id}/learning/report`))).every((row: any) => row.homework === 'not_assigned'));
    });
    await t.test('students can hand in multiple files, and private access follows ownership', async () => {
      assert.equal((await ok(await request(3, '/api/student/homework'))).length, 2);
      const files = [await upload(3, 'answer.txt'), await upload(3, 'working.txt')];
      const handedIn = await ok(await request(3, `${path}/submit`, 'POST', { text: 'My explanation', attachments: files }), 201);
      assert.equal(handedIn.attachments.length, 2); assert.equal(handedIn.status, 'SUBMITTED');
      assert.equal((await fetch(`${base}${files[0].url}`)).status, 401);
      assert.equal((await request(2, files[0].url)).status, 404);
      assert.equal((await request(4, files[0].url)).status, 404);
      for (const index of [0, 1, 3]) {
        const response = await request(index, files[0].url); assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'private, no-store'); assert.equal(await response.text(), 'My homework answer');
      }
      assert.equal((await request(4, worksheet.url)).status, 200);
      assert.equal((await request(2, worksheet.url)).status, 404);
      await db.student.update({ where: { id: students[1] }, data: { classId: null } });
      assert.equal((await request(4, `${path}/submit`, 'POST', { text: 'Wrong class' })).status, 404);
      assert.equal((await request(4, worksheet.url)).status, 404);
      await db.student.update({ where: { id: students[1] }, data: { classId } });
      assert.equal((await request(4, `${path}/submit`, 'POST', { attachments: files })).status, 400);
      const fake = { ...files[0], url: `/uploads/homework-media/${users[3]}-${randomUUID()}.txt` };
      assert.equal((await request(3, `${path}/submit`, 'POST', { attachments: [fake] })).status, 400);
      assert.equal((await request(3, `${path}/submit`, 'POST', { attachments: [{ ...files[0], size: 999 }] })).status, 400);
      assert.equal((await request(3, '/api/homework-media', 'DELETE', { url: files[0].url })).status, 409);
    });
    await t.test('grades, requested changes and resubmissions stay consistent with the gradebook', async () => {
      assert.equal((await request(1, `${path}/mark`, 'POST', { studentId: students[0], status: 'MARKED', score: 11 })).status, 400);
      await ok(await request(1, `${path}/mark`, 'POST', { studentId: students[0], status: 'MARKED', score: 0, feedback: 'Please check your working.' }));
      const sync = await ok(await request(1, `${path}/sync-gradebook`, 'POST'));
      assert.equal((await db.grade.findUniqueOrThrow({ where: { gradeItemId_studentId: { gradeItemId: sync.gradeItemId, studentId: students[0] } } })).marks, 0);
      assert.ok(!(await ok(await request(2, `/api/gradebook?classId=${classId}`))).items.some((item: any) => item.id === sync.gradeItemId));
      const progress = await ok(await request(2, `/api/gradebook/student/${students[0]}`)); assert.deepEqual(progress.trend, []); assert.deepEqual(progress.comments, []);
      assert.equal((await request(2, `/api/grade-items/${sync.gradeItemId}`, 'PUT', { title: 'Hijacked' })).status, 403);
      assert.equal((await request(2, `/api/grade-items/${sync.gradeItemId}`, 'DELETE')).status, 403);
      assert.equal((await request(2, '/api/grades/bulk', 'POST', { gradeItemId: sync.gradeItemId, entries: [{ studentId: students[0], marks: 10 }] })).status, 403);
      assert.ok((await ok(await request(3, '/api/student/grades'))).trend.some((row: any) => row.title.includes('private assignment')));
      assert.ok((await ok(await request(0, `/api/gradebook/student/${students[0]}`))).comments.length > 0);
      assert.equal((await request(3, `${path}/submit`, 'POST', { text: 'Cannot overwrite marked work' })).status, 409);
      assert.equal((await request(1, `${path}/mark`, 'POST', { studentId: students[0], status: 'REDO' })).status, 400);
      await ok(await request(1, `${path}/mark`, 'POST', { studentId: students[0], status: 'REDO', feedback: 'Show your calculation.' }));
      assert.equal(await db.grade.count({ where: { gradeItemId: sync.gradeItemId } }), 0);
      const revised = await upload(3, 'revision.txt');
      const resubmitted = await ok(await request(3, `${path}/submit`, 'POST', { attachments: [revised] })); assert.equal(resubmitted.status, 'SUBMITTED'); assert.equal(resubmitted.attachments.length, 1); assert.equal(resubmitted.score, null);
      await ok(await request(1, path, 'PUT', { status: 'CLOSED' }));
      assert.equal((await request(3, `${path}/submit`, 'POST', { text: 'Closed' })).status, 403);
      await ok(await request(0, path, 'PUT', { status: 'OPEN' }));
      await ok(await request(1, `${path}/mark`, 'POST', { studentId: students[0], status: 'MARKED', score: 6 }));
      await ok(await request(1, `/api/grade-items/${sync.gradeItemId}`, 'DELETE'));
      assert.equal((await ok(await request(1, path))).gradeItemId, null);
      await ok(await request(1, path, 'PUT', { title: 'Revised private homework' }));
      const recreated = await ok(await request(1, `${path}/sync-gradebook`, 'POST'));
      assert.notEqual(recreated.gradeItemId, sync.gradeItemId);
    });
  } finally {
    await db.videoLesson.deleteMany({ where: { id: { in: videos } } });
    for (const id of homework) { await request(0, `/api/homework/${id}`, 'DELETE'); }
    for (const file of uploaded) await request(file.owner, '/api/homework-media', 'DELETE', { url: file.url });
    await db.student.deleteMany({ where: { id: { in: students } } });
    await db.classTeacher.deleteMany({ where: { teacherId: { in: teachers } } });
    await db.teacher.deleteMany({ where: { id: { in: teachers } } });
    if (classId) await db.class.delete({ where: { id: classId } });
    await db.auditLog.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect();
  }
});
