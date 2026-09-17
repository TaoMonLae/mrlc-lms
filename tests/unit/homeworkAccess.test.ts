import assert from 'node:assert/strict';
import test from 'node:test';
import { ownsHomework, homeworkTeacherScope } from '../../shared/homeworkAccess';
import { validateHomeworkFile } from '../../shared/homeworkAttachments';

test('homework ownership is independent of shared classroom membership', () => {
  assert.equal(ownsHomework({ userId: 'owner', role: 'TEACHER' }, 'owner'), true);
  assert.equal(ownsHomework({ userId: 'coworker', role: 'TEACHER' }, 'owner'), false);
  assert.equal(ownsHomework({ userId: 'owner', role: 'STUDENT' }, 'owner'), false);
  assert.equal(ownsHomework({ userId: 'admin', role: 'ADMIN' }, null), true);
  assert.deepEqual(homeworkTeacherScope({ userId: 'owner', role: 'TEACHER' }), { teacher: { userId: 'owner' } });
  assert.deepEqual(homeworkTeacherScope({ userId: 'admin', role: 'ADMIN' }), {});
});
test('homework file validation rejects empty, unsupported and oversized work', () => {
  assert.equal(validateHomeworkFile(new File(['work'], 'answer.pdf', { type: 'application/pdf' })), null);
  assert.match(validateHomeworkFile(new File([], 'answer.pdf'))!, /empty/);
  assert.match(validateHomeworkFile(new File(['script'], 'answer.html'))!, /Choose/);
  assert.match(validateHomeworkFile({ name: `${'a'.repeat(181)}.pdf`, size: 1 })!, /180/);
  assert.match(validateHomeworkFile(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'answer.pdf'))!, /10 MB/);
});
