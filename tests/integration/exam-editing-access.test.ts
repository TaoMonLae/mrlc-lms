import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { cloneExam } from '../../lib/cloneExam';
import { PrismaPg } from '@prisma/adapter-pg';

const dbUrl = process.env.EXAM_ACCESS_TEST_DATABASE_URL;
const base = process.env.EXAM_ACCESS_TEST_BASE_URL;
const secret = process.env.EXAM_ACCESS_TEST_SECRET;
const enabled = dbUrl && new URL(dbUrl).hostname === '127.0.0.1' && new URL(dbUrl).port === '55489' && base === 'http://127.0.0.1:5891' && secret;

test('exam management protects access, cloned content, schedules and locked papers', { skip: !enabled }, async () => {
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
    await check(0, path+'/schedule', 'PUT', 200, { availableFrom: '2026-11-05T01:00:00Z', availableUntil: '2026-11-05T03:00:00Z' });
    await check(0, path+'/schedule', 'PUT', 400, { availableUntil: '2026-11-05T00:00:00Z' });
    await check(0, path+'/schedule', 'PUT', 400, { attemptLimit: 'invalid' });
    await check(0, path+'/schedule', 'PUT', 200, { durationMinutes: null });
    await check(0, '/api/exam-attempts/unused/grade', 'PUT', 410, { answers: [] });

    // Studio content and advanced structures must survive the normal Clone entry point.
    const section = await db.examSection.create({ data: { examId: id, title: 'Reading' } });
    const stimulus = await db.stimulus.create({ data: { examId: id, type: 'TEXT', content: 'Evidence for the answer.' } });
    const group = await db.questionGroup.create({ data: { examId: id, sectionId: section.id, stimulusId: stimulus.id, title: 'Reading group' } });
    const question = await db.question.create({ data: {
      examId: id, text: 'Select the evidence.', type: 'MCQ', points: 2,
      sectionId: section.id, stimulusId: stimulus.id, groupId: group.id,
      optionRows: { create: [{ text: 'Supported', isCorrect: true }, { text: 'Unsupported', isCorrect: false }] },
    }, include: { optionRows: true } });
    const correct = question.optionRows.find(row => row.isCorrect)!.id;
    await db.question.update({ where: { id: question.id }, data: { correctAnswer: correct, correctAnswers: [correct], optionWeights: { [correct]: 2 } } });
    await db.gradingRubric.create({ data: { examId: id, questionId: question.id, title: 'Evidence', maxScore: 2,
      criteria: { create: { label: 'Uses evidence', maxScore: 2, levels: [{ points: 2, label: 'Complete' }] } } } });
    await db.examResultPolicy.create({ data: { examId: id, releaseMode: 'SCHEDULED', releaseAt: new Date('2026-11-05T05:00:00Z'), showCorrectAnswers: true } });
    const cloned = await (await check(1, path+'/clone', 'POST', 201)).json();
    exams.push(cloned.id);
    const graph = await db.exam.findUniqueOrThrow({ where: { id: cloned.id }, include: {
      questions: { include: { optionRows: true } }, sections: true, stimuli: true, questionGroups: true,
      rubrics: { include: { criteria: true } }, resultPolicy: true, assignments: true, attempts: true,
    } });
    assert.equal(graph.ownerId, people[1]);
    assert.deepEqual(graph.editorIds, []);
    assert.equal(graph.questions.length, 1);
    assert.equal(graph.questions[0].text, question.text);
    assert.notEqual(graph.questions[0].id, question.id);
    assert.equal(graph.questions[0].sectionId, graph.sections[0].id);
    assert.equal(graph.questions[0].groupId, graph.questionGroups[0].id);
    assert.equal(graph.questionGroups[0].stimulusId, graph.stimuli[0].id);
    const newCorrect = graph.questions[0].optionRows.find(row => row.isCorrect)!.id;
    assert.notEqual(newCorrect, correct);
    assert.equal(graph.questions[0].correctAnswer, newCorrect);
    assert.deepEqual(graph.questions[0].correctAnswers, [newCorrect]);
    assert.deepEqual(graph.questions[0].optionWeights, { [newCorrect]: 2 });
    assert.equal(graph.rubrics[0].questionId, graph.questions[0].id);
    assert.equal(graph.rubrics[0].criteria[0].label, 'Uses evidence');
    assert.equal(graph.resultPolicy?.releaseMode, 'SCHEDULED');
    assert.equal(graph.resultPolicy?.releaseAt, null);
    assert.equal(graph.assignments.length + graph.attempts.length, 0);
    await check(0, '/api/exams/'+cloned.id, 'PUT', 403, draft);
    const count = await db.exam.count();
    await assert.rejects(db.$transaction(async tx => {
      await cloneExam(tx, id, people[0]);
      throw new Error('Copy failed');
    }), /Copy failed/);
    assert.equal(await db.exam.count(), count);
    await db.exam.update({ where: { id }, data: { status: 'PUBLISHED' } });
    await check(0, '/api/stimuli/'+stimulus.id, 'PUT', 409, { content: 'Changed passage' });
    await check(0, path+'/blueprint', 'POST', 409, { count: 1 });
    await check(0, path+'/questions', 'POST', 409, { questionId: question.id });
    assert.equal((await db.stimulus.findUniqueOrThrow({ where: { id: stimulus.id } })).content, 'Evidence for the answer.');


    await check(0, path+'/editors', 'PUT', 200, grant(1,false));
    await check(1, path+'/schedule', 'PUT', 403, { durationMinutes: 99 });
    await check(1, path, 'DELETE', 403);
    await check(1, path+'/results', 'GET', 403);
    await check(1, path+'/preview', 'GET', 200);
    assert.equal((await db.exam.findUniqueOrThrow({ where: { id } })).title, 'Edited by invitation');
  } finally {
    await db.gradingRubric.deleteMany({ where: { examId: { in: exams } } });
    await db.exam.deleteMany({ where: { id: { in: exams } } });
    if (classId) { await db.classTeacher.deleteMany({ where: { classId } }); await db.class.delete({ where: { id: classId } }); }
    if (subjectId) await db.subject.delete({ where: { id: subjectId } });
    await db.teacher.deleteMany({ where: { userId: { in: people } } });
    await db.user.deleteMany({ where: { id: { in: people } } });
    await db.$disconnect();
  }
});
