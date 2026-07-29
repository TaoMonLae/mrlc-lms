import test from "node:test";
import assert from "node:assert/strict";
import {
  isExternalLearnerApiRequestAllowed,
  isExternalLearnerAppPathAllowed,
} from "../../shared/externalLearnerAccess";

test("external learners stay within the Language Quest browser routes", () => {
  const allowed = [
    "/language-quest",
    "/language-quest/about",
    "/games/language-quest",
    "/games/language-quest/",
    "/games/language-quest/profile",
    "/games/language-quest/leaderboard",
    "/games/language-quest/mastery",
    "/games/language-quest/courses/course-1",
    "/games/language-quest/lessons/lesson-1",
    "/change-password",
  ];
  const denied = [
    "/",
    "/dashboard",
    "/dictionary",
    "/student/library",
    "/games/sudoku",
    "/games/language-quest/manage",
    "/games/language-quest/manage/course-1",
    "/games/language-quest/courses/course-1/edit",
  ];

  for (const pathname of allowed) {
    assert.equal(isExternalLearnerAppPathAllowed(pathname), true, pathname);
  }
  for (const pathname of denied) {
    assert.equal(isExternalLearnerAppPathAllowed(pathname), false, pathname);
  }
});

test("external learner API access uses an explicit method and route allowlist", () => {
  const allowed: Array<[string, string]> = [
    ["GET", "/api/auth/me"],
    ["POST", "/api/auth/logout"],
    ["POST", "/api/auth/change-password"],
    ["GET", "/api/language-quest/overview"],
    ["GET", "/api/language-quest/profile"],
    ["GET", "/api/language-quest/leaderboard?limit=10"],
    ["GET", "/api/language-quest/engagement"],
    ["GET", "/api/language-quest/mastery"],
    ["GET", "/api/language-quest/courses/course-1"],
    ["GET", "/api/language-quest/lessons/lesson-1"],
    ["GET", "/api/language-quest/lessons/lesson-1/preview"],
    ["POST", "/api/language-quest/challenges/challenge-1/answer"],
    ["POST", "/api/language-quest/mastery/challenge-1/answer"],
    ["POST", "/api/language-quest/missions/daily-xp/claim"],
    ["POST", "/api/language-quest/profile/classrooms"],
    ["PATCH", "/api/language-quest/profile"],
    ["DELETE", "/api/language-quest/profile/classrooms/classroom-1"],
  ];
  const denied: Array<[string, string]> = [
    ["GET", "/api/students"],
    ["GET", "/api/library"],
    ["GET", "/api/language-quest/manage/courses"],
    ["POST", "/api/language-quest/manage/courses"],
    ["DELETE", "/api/language-quest/manage/courses/course-1"],
    ["POST", "/api/language-quest/courses/course-1"],
    ["GET", "/api/language-quest/challenges/challenge-1/answer"],
    ["POST", "/api/auth/mfa/disable"],
  ];

  for (const [method, pathname] of allowed) {
    assert.equal(isExternalLearnerApiRequestAllowed(method, pathname), true, `${method} ${pathname}`);
  }
  for (const [method, pathname] of denied) {
    assert.equal(isExternalLearnerApiRequestAllowed(method, pathname), false, `${method} ${pathname}`);
  }
});
