import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const url = process.env.VIDEO_TEST_DATABASE_URL;
const base = process.env.VIDEO_TEST_BASE_URL;
const secret = process.env.VIDEO_TEST_SESSION_SECRET;
// Never run fixture writes against a developer or production database.
const enabled = Boolean(url && new URL(url).hostname === '127.0.0.1' && new URL(url).port === '55439' && base && new URL(base).hostname === '127.0.0.1' && secret);
test('video learning permissions, privacy, completion and integration', { skip: !enabled }, async t => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url! }) });
  const users: string[] = [], classes: string[] = [], videos: string[] = [], students: string[] = [], exams: string[] = [], playlists: string[] = [];
  let teacherId = '', subjectId = '', homeworkId = '';
  const request = (user: number, role: string, path: string, method = 'GET', body?: unknown) => fetch(`${base}${path}`, { method, headers: { Authorization: `Bearer ${jwt.sign({ role, userId: users[user], email: 'learning@example.test' }, secret!, { expiresIn: '15m' })}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const ok = async (response: Response, status = 200) => { assert.equal(response.status, status, await response.clone().text()); return response.json(); };
  try {
    for (const role of ['ADMIN', 'TEACHER', 'STUDENT', 'STUDENT', 'TEACHER'] as const) users.push((await db.user.create({ data: { role, email: `${randomUUID()}@example.test`, firstName: role, lastName: 'Learning Test' } })).id);
    for (const name of ['Learning A', 'Learning B']) classes.push((await db.class.create({ data: { name, level: 'GED', academicYear: '2026' } })).id);
    teacherId = (await db.teacher.create({ data: { userId: users[1], teacherCode: randomUUID() } })).id;
    await db.classTeacher.create({ data: { classId: classes[0], teacherId } });
    subjectId = (await db.subject.create({ data: { name: 'Learning Test', code: randomUUID() } })).id;
    for (const index of [2, 3]) students.push((await db.student.create({ data: { userId: users[index], studentCode: randomUUID(), classId: classes[0] } })).id);
    for (const status of ['PUBLISHED', 'DRAFT']) videos.push((await db.videoLesson.create({ data: { title: 'Learning Test', videoUrl: 'https://youtu.be/-mzqQ_vNiKg', duration: 540, classId: classes[0], uploadedById: users[1], uploadedByName: 'Teacher', status, visibility: 'STUDENTS' } })).id);
    for (const classId of classes) exams.push((await db.exam.create({ data: { title: 'Learning Quiz', type: 'QUIZ', status: 'PUBLISHED', date: new Date(), classId, subjectId, passMark: 6, totalMarks: 10 } })).id);
    homeworkId = (await db.homework.create({ data: { title: 'Learning Homework', classId: classes[0], teacherId, dueDate: new Date(Date.now() + 86400000) } })).id;
    const path = `/api/videos/${videos[0]}`;
    const config = { examId: exams[0], homeworkId, requireQuiz: true, chapters: [{ title: 'Introduction', seconds: 0 }, { title: 'Safety', seconds: 90 }] };
    await t.test('only authorized managers attach valid same-class resources', async () => {
      await ok(await request(1, 'TEACHER', `${path}/learning`, 'PUT', config));
      assert.equal((await request(2, 'STUDENT', `${path}/learning`, 'PUT', config)).status, 403);
      assert.equal((await request(4, 'TEACHER', `${path}/learning`, 'PUT', config)).status, 403);
      assert.equal((await request(0, 'ADMIN', `${path}/learning`, 'PUT', { ...config, examId: exams[1] })).status, 400);
      assert.equal((await request(0, 'ADMIN', `${path}/learning`, 'PUT', { ...config, chapters: [{ title: 'End', seconds: 540 }] })).status, 400);
      await db.exam.update({ where: { id: exams[0] }, data: { passMark: null } });
      assert.equal((await request(0, 'ADMIN', `${path}/learning`, 'PUT', config)).status, 400);
      await db.exam.update({ where: { id: exams[0] }, data: { passMark: 6 } });
    });
    await t.test('resume rewinds without erasing furthest progress and inaccessible lessons stay hidden', async () => {
      await ok(await request(2, 'STUDENT', `${path}/progress`, 'POST', { currentPosition: 300, isCompleted: false, duration: 600 }));
      const progress = await ok(await request(2, 'STUDENT', `${path}/progress`, 'POST', { currentPosition: 90, isCompleted: false, duration: 600 }));
      assert.equal(progress.currentPosition, 300); assert.equal(progress.resumePosition, 90);
      assert.equal((await db.videoLesson.findUniqueOrThrow({ where: { id: videos[0] } })).duration, 600);
      assert.equal((await request(2, 'STUDENT', `/api/videos/${videos[1]}/progress`, 'POST', { currentPosition: 10, isCompleted: false })).status, 404);
      assert.equal((await request(2, 'STUDENT', `/api/videos/${videos[1]}/learning`)).status, 404);
      await db.videoProgress.create({ data: { userId: users[2], videoId: videos[1], currentPosition: 10 } });
      const all = await ok(await request(2, 'STUDENT', '/api/videos/progress'));
      assert.ok(!all.some((p: any) => p.videoId === videos[1]));
    });
    await t.test('unreleased grades never reveal a pass; released passing quizzes complete learning', async () => {
      const attempt = await db.examAttempt.create({ data: { studentId: students[0], examId: exams[0], score: 7, isCompleted: true, state: 'FINALIZED', gradingStatus: 'COMPLETE' } });
      await ok(await request(2, 'STUDENT', `${path}/progress`, 'POST', { currentPosition: 600, isCompleted: true, duration: 600 }));
      let learning = await ok(await request(2, 'STUDENT', `${path}/learning`));
      assert.equal(learning.quiz.status, 'submitted'); assert.equal(learning.learningComplete, false);
      assert.equal(learning.quiz.href, `/exams/${exams[0]}/take`);
      assert.equal(learning.homework.href, `/student/homework?assignment=${homeworkId}`);
      assert.equal(learning.quiz.score, undefined);
      await db.examAttempt.update({ where: { id: attempt.id }, data: { releasedAt: new Date(), state: 'RELEASED' } });
      learning = await ok(await request(2, 'STUDENT', `${path}/learning`));
      assert.equal(learning.quiz.status, 'passed'); assert.equal(learning.learningComplete, true);
      await db.homeworkSubmission.create({ data: { homeworkId, studentId: students[0], text: 'Reflection', status: 'SUBMITTED' } });
      assert.equal((await ok(await request(2, 'STUDENT', `${path}/learning`))).homework.status, 'SUBMITTED');
    });
    await t.test('individually assigned quizzes are hidden from other students', async () => {
      await db.examAssignment.create({ data: { examId: exams[0], studentId: students[0] } });
      assert.equal((await ok(await request(3, 'STUDENT', `${path}/learning`))).quiz, null);
      const report = await ok(await request(1, 'TEACHER', `${path}/learning/report`));
      assert.equal(report.find((r: any) => r.studentId === students[1]).quiz, 'not_assigned');
    });
    await t.test('notes remain private; questions and replies are shared only with author and managers', async () => {
      const note = await ok(await request(2, 'STUDENT', `${path}/notes`, 'POST', { seconds: 90, body: 'Private thought', isQuestion: false }), 201);
      const question = await ok(await request(2, 'STUDENT', `${path}/notes`, 'POST', { seconds: 100, body: 'Why is weather important?', isQuestion: true }), 201);
      const managerNotes = await ok(await request(1, 'TEACHER', `${path}/notes`));
      assert.ok(!managerNotes.some((n: any) => n.id === note.id)); assert.ok(managerNotes.some((n: any) => n.id === question.id));
      assert.deepEqual(await ok(await request(3, 'STUDENT', `${path}/notes`)), []);
      assert.deepEqual(await ok(await request(4, 'TEACHER', `${path}/notes`)), []);
      assert.equal((await request(3, 'STUDENT', `${path}/notes/${question.id}/reply`, 'PUT', { reply: 'Not allowed' })).status, 403);
      await ok(await request(1, 'TEACHER', `${path}/notes/${question.id}/reply`, 'PUT', { reply: 'Avoid floods.' }));
      assert.equal((await ok(await request(2, 'STUDENT', `${path}/notes`))).find((n: any) => n.id === question.id).reply, 'Avoid floods.');
      assert.equal((await request(0, 'ADMIN', `${path}/notes/${note.id}`, 'DELETE')).status, 404);
      await ok(await request(2, 'STUDENT', `${path}/notes/${note.id}`, 'DELETE'));
    });
    await t.test('ordered units omit hidden lessons and enforce ownership', async () => {
      const row = await ok(await request(1, 'TEACHER', '/api/video-playlists', 'POST', { title: 'Safety Unit', videoIds: [videos[1], videos[0]] }), 201); playlists.push(row.id);
      const visible = await ok(await request(2, 'STUDENT', '/api/video-playlists'));
      assert.deepEqual(visible.find((p: any) => p.id === row.id).videoIds, [videos[0]]);
      assert.equal((await request(4, 'TEACHER', `/api/video-playlists/${row.id}`, 'PUT', { title: 'Hijacked', videoIds: [videos[0]] })).status, 403);
      assert.equal((await request(1, 'TEACHER', '/api/video-playlists', 'POST', { title: 'Repeated', videoIds: [videos[0], videos[0]] })).status, 400);
      assert.equal((await request(2, 'STUDENT', `/api/video-playlists/${row.id}`, 'DELETE')).status, 403);
    });
    await t.test('reports separate homework from watch and quiz; reminders are targeted and deduplicated', async () => {
      assert.equal((await request(2, 'STUDENT', `${path}/learning/report`)).status, 403);
      const report = await ok(await request(1, 'TEACHER', `${path}/learning/report`));
      const completed = report.find((r: any) => r.studentId === students[0]);
      assert.equal(completed.watched, true); assert.equal(completed.quiz, 'passed'); assert.equal(completed.homework, 'SUBMITTED');
      assert.equal((await ok(await request(1, 'TEACHER', `${path}/learning/reminders`, 'POST', { target: 'homework' }))).sent, 1);
      assert.equal((await ok(await request(1, 'TEACHER', `${path}/learning/reminders`, 'POST', { target: 'homework' }))).sent, 0);
      assert.equal(await db.notification.count({ where: { userId: users[2], type: 'VIDEO_LESSON' } }), 0);
      assert.equal(await db.notification.count({ where: { userId: users[3], type: 'VIDEO_LESSON' } }), 1);
      await db.homework.update({ where: { id: homeworkId }, data: { status: 'CLOSED' } });
      assert.equal((await request(1, 'TEACHER', `${path}/learning/reminders`, 'POST', { target: 'homework' })).status, 400);
      await db.exam.update({ where: { id: exams[0] }, data: { status: 'DRAFT' } });
      assert.equal((await request(1, 'TEACHER', `${path}/learning/reminders`, 'POST', { target: 'quiz' })).status, 400);
    });
    await t.test('changing class detaches linked activities atomically', async () => {
      await ok(await request(0, 'ADMIN', path, 'PUT', { classId: classes[1] }));
      const stored = await db.videoLearning.findUniqueOrThrow({ where: { videoId: videos[0] } });
      assert.equal(stored.examId, null); assert.equal(stored.homeworkId, null); assert.equal(stored.requireQuiz, false);
      assert.equal((await request(2, 'STUDENT', `${path}/learning`)).status, 404);
    });
  } finally {
    await db.notification.deleteMany({ where: { userId: { in: users } } });
    await db.videoPlaylist.deleteMany({ where: { id: { in: playlists } } });
    await db.videoLesson.deleteMany({ where: { id: { in: videos } } });
    await db.examAttempt.deleteMany({ where: { examId: { in: exams } } });
    await db.exam.deleteMany({ where: { id: { in: exams } } });
    if (homeworkId) await db.homework.delete({ where: { id: homeworkId } });
    await db.student.deleteMany({ where: { id: { in: students } } });
    await db.classTeacher.deleteMany({ where: { teacherId } });
    if (teacherId) await db.teacher.delete({ where: { id: teacherId } });
    await db.class.deleteMany({ where: { id: { in: classes } } });
    if (subjectId) await db.subject.delete({ where: { id: subjectId } });
    await db.auditLog.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect();
  }
});
