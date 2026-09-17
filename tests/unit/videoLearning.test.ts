import assert from 'node:assert/strict';
import test from 'node:test';
import { videoLearningSchema, quizPassed } from '../../shared/videoLearning';
import { youtubeErrorMessage } from '../../src/lib/youtubePlayer';
test('video activities need a linked quiz when passing is required', () => {
  assert.equal(videoLearningSchema.safeParse({ requireQuiz: true }).success, false);
  assert.deepEqual(videoLearningSchema.parse({}), { examId: null, homeworkId: null, requireQuiz: false, chapters: [] });
});
test('video chapters have ordered, unique, bounded timestamps and titles', () => {
  assert.equal(videoLearningSchema.safeParse({ chapters: [{ title: 'Intro', seconds: 0 }, { title: 'Topic', seconds: 90 }] }).success, true);
  for (const chapters of [[{ title: 'Intro', seconds: -1 }], [{ title: '', seconds: 0 }], [{ title: 'A', seconds: 10 }, { title: 'B', seconds: 10 }]]) assert.equal(videoLearningSchema.safeParse({ chapters }).success, false);
});
test('passing is based on the configured mark and valid completed grading, not watch status', () => {
  const attempt = { score: 7, isCompleted: true, invalidatedAt: null, gradingStatus: 'COMPLETE' };
  assert.equal(quizPassed(attempt, 6), true);
  assert.equal(quizPassed(attempt, null), false);
  assert.equal(quizPassed({ ...attempt, invalidatedAt: new Date() }, 6), false);
  assert.equal(quizPassed({ ...attempt, gradingStatus: 'PENDING' }, 6), false);
  assert.equal(quizPassed({ ...attempt, isCompleted: false }, 6), false);
  assert.equal(quizPassed({ ...attempt, score: null }, 6), false);
});
test('YouTube playback errors explain removal, embed restrictions and blocked identity', () => {
  assert.match(youtubeErrorMessage(100), /removed/);
  assert.match(youtubeErrorMessage(150), /does not allow/);
  assert.match(youtubeErrorMessage(153), /identify/);
});
