import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeVideoDuration,
  resolveVideoProgressUpdate,
  videoWatchPercent,
} from "../../shared/videoProgress";

test("video watch percentage uses browser-reported duration", () => {
  const progress = resolveVideoProgressUpdate({
    currentPosition: 125,
    reportedDuration: 500,
    storedDuration: null,
    isCompleted: false,
  });

  assert.deepEqual(progress, {
    currentPosition: 125,
    duration: 500,
    percent: 25,
    isCompleted: false,
  });
});

test("video progress and completion cannot be erased by a later rewind", () => {
  const progress = resolveVideoProgressUpdate({
    currentPosition: 10,
    reportedDuration: 100,
    storedDuration: 100,
    isCompleted: false,
    previousPosition: 95,
    wasCompleted: true,
  });

  assert.equal(progress.currentPosition, 95);
  assert.equal(progress.percent, 100);
  assert.equal(progress.isCompleted, true);
});

test("video progress completes at the configured watch threshold", () => {
  const progress = resolveVideoProgressUpdate({
    currentPosition: 90,
    reportedDuration: 100,
    isCompleted: false,
  });

  assert.equal(progress.percent, 100);
  assert.equal(progress.isCompleted, true);
});

test("rounded display percentage does not complete a video before 90 percent", () => {
  const progress = resolveVideoProgressUpdate({
    currentPosition: 895,
    reportedDuration: 1_000,
    isCompleted: false,
  });

  assert.equal(progress.percent, 90);
  assert.equal(progress.isCompleted, false);
});

test("video progress rejects unusable duration values safely", () => {
  assert.equal(normalizeVideoDuration(0), null);
  assert.equal(normalizeVideoDuration(Number.POSITIVE_INFINITY), null);
  assert.equal(videoWatchPercent(50, null), 0);
  assert.equal(videoWatchPercent(Number.NaN, 100), 0);
});
