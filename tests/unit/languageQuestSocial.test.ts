import assert from 'node:assert/strict';
import test from 'node:test';
import {
  languageQuestFriendCourseIsVisible,
  languageQuestRelationship,
  languageQuestXpAdjustment,
} from '../../shared/languageQuestSocial';

test('friend relationships distinguish requests, accepted friends, and self', () => {
  assert.equal(languageQuestRelationship(false, false), 'NONE');
  assert.equal(languageQuestRelationship(true, false), 'OUTGOING');
  assert.equal(languageQuestRelationship(false, true), 'INCOMING');
  assert.equal(languageQuestRelationship(true, true), 'FRIENDS');
  assert.equal(languageQuestRelationship(false, false, true), 'SELF');
});

test('course visibility is limited to self and mutual friends', () => {
  assert.equal(languageQuestFriendCourseIsVisible('NONE'), false);
  assert.equal(languageQuestFriendCourseIsVisible('OUTGOING'), false);
  assert.equal(languageQuestFriendCourseIsVisible('INCOMING'), false);
  assert.equal(languageQuestFriendCourseIsVisible('FRIENDS'), true);
  assert.equal(languageQuestFriendCourseIsVisible('SELF'), true);
});

test('XP adjustment is bounded, integral, and never makes XP negative', () => {
  assert.deepEqual(languageQuestXpAdjustment(250, 75), { nextPoints: 325, appliedDelta: 75 });
  assert.deepEqual(languageQuestXpAdjustment(30, -100), { nextPoints: 0, appliedDelta: -30 });
  assert.equal(languageQuestXpAdjustment(0, -10), null);
  assert.equal(languageQuestXpAdjustment(10, 0), null);
  assert.equal(languageQuestXpAdjustment(10, 1.5), null);
  assert.equal(languageQuestXpAdjustment(10, 10_001), null);
});
