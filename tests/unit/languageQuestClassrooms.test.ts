import assert from "node:assert/strict";
import test from "node:test";
import { canAccessLanguageQuestCourse } from "../../languageQuest";
import {
  canJoinLanguageQuestClassroom,
  languageQuestClassroomChallengeStatus,
  languageQuestClassroomInvitePath,
  languageQuestProfileSection,
  normalizeLanguageQuestClassroomCode,
} from "../../shared/languageQuestClassrooms";

test("Language Quest classroom codes are normalized consistently", () => {
  assert.equal(normalizeLanguageQuestClassroomCode(" ab-cd 12!xy "), "ABCD12XY");
  assert.equal(normalizeLanguageQuestClassroomCode("abcdefghijk"), "ABCDEFGH");
  assert.equal(normalizeLanguageQuestClassroomCode(null), "");
});

test("closed classrooms reject new joins without breaking existing invite links", () => {
  assert.equal(canJoinLanguageQuestClassroom(true, false), true);
  assert.equal(canJoinLanguageQuestClassroom(false, true), true);
  assert.equal(canJoinLanguageQuestClassroom(false, false), false);
});

test("classroom challenges distinguish active, completed, closed, and expired states", () => {
  const now = new Date("2026-08-05T12:00:00.000Z");
  const base = {
    active: true,
    complete: false,
    startsAt: "2026-08-01T00:00:00.000Z",
    endsAt: "2026-08-06T00:00:00.000Z",
  };
  assert.equal(languageQuestClassroomChallengeStatus(base, now), "ACTIVE");
  assert.equal(languageQuestClassroomChallengeStatus({ ...base, complete: true }, now), "COMPLETED");
  assert.equal(languageQuestClassroomChallengeStatus({ ...base, active: false }, now), "CLOSED");
  assert.equal(languageQuestClassroomChallengeStatus({ ...base, startsAt: "2026-08-06T00:00:00.000Z" }, now), "UPCOMING");
  assert.equal(languageQuestClassroomChallengeStatus({ ...base, endsAt: "2026-08-05T12:00:00.000Z" }, now), "ENDED");
});

test("classroom invite links open the learner classroom tab with a safe code", () => {
  assert.equal(
    languageQuestClassroomInvitePath("ab-cd12xy"),
    "/games/language-quest/profile?classroomCode=ABCD12XY#classrooms",
  );
  assert.equal(languageQuestProfileSection("#classrooms"), "classrooms");
  assert.equal(languageQuestProfileSection("#quest-cards"), "cards");
  assert.equal(languageQuestProfileSection("#unknown"), "profile");
});

test("classroom membership grants learners access to an assigned draft course", async () => {
  const queries: any[] = [];
  const prisma = {
    languageQuestClassroomMember: {
      findFirst: async (query: any) => {
        queries.push(query);
        return { id: "membership-1" };
      },
    },
  };

  assert.equal(await canAccessLanguageQuestCourse(
    prisma,
    { userId: "learner-1", role: "STUDENT" },
    { id: "course-1", published: false },
  ), true);
  assert.deepEqual(queries[0].where, {
    userId: "learner-1",
    classroom: { focusCourseId: "course-1" },
  });
});

test("published courses and course managers do not require classroom membership", async () => {
  const prisma = {
    languageQuestClassroomMember: {
      findFirst: async () => { throw new Error("membership lookup should not run"); },
    },
  };

  assert.equal(await canAccessLanguageQuestCourse(
    prisma,
    { userId: "learner-1", role: "STUDENT" },
    { id: "course-1", published: true },
  ), true);
  assert.equal(await canAccessLanguageQuestCourse(
    prisma,
    { userId: "teacher-1", role: "TEACHER" },
    { id: "course-1", published: false },
  ), true);
});

test("an unassigned draft course stays private from learners", async () => {
  const prisma = {
    languageQuestClassroomMember: { findFirst: async () => null },
  };
  assert.equal(await canAccessLanguageQuestCourse(
    prisma,
    { userId: "learner-1", role: "STUDENT" },
    { id: "course-1", published: false },
  ), false);
});
