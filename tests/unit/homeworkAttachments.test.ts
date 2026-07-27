import assert from "node:assert/strict";
import test from "node:test";
import {
  HOMEWORK_FILE_MAX_BYTES,
  HOMEWORK_SUBMISSION_FILE_LIMIT,
  homeworkMediaOwnerId,
  isAllowedHomeworkFile,
  parseHomeworkSubmissionAttachments,
} from "../../shared/homeworkAttachments";

const ownerId = "12345678-1234-1234-1234-123456789abc";

function attachment(index: number, extension = "pdf") {
  const suffix = String(index).padStart(12, "0");
  return {
    url: `/uploads/homework-media/${ownerId}-aaaaaaaa-aaaa-4aaa-8aaa-${suffix}.${extension}`,
    originalName: `student-work-${index}.${extension}`,
    mimeType: "ignored-by-server",
    size: 1024 + index,
  };
}

test("homework submission accepts up to five owned documents", () => {
  const input = Array.from({ length: HOMEWORK_SUBMISSION_FILE_LIMIT }, (_, index) => attachment(index + 1));
  const parsed = parseHomeworkSubmissionAttachments(input, ownerId);

  assert.equal(parsed?.length, HOMEWORK_SUBMISSION_FILE_LIMIT);
  assert.equal(parsed?.[0].originalName, "student-work-1.pdf");
  assert.equal(parsed?.[0].mimeType, "application/pdf");
  assert.equal(homeworkMediaOwnerId(parsed?.[0].url ?? ""), ownerId);
});

test("homework submission rejects too many files and oversized files", () => {
  const tooMany = Array.from({ length: HOMEWORK_SUBMISSION_FILE_LIMIT + 1 }, (_, index) => attachment(index + 1));
  assert.equal(parseHomeworkSubmissionAttachments(tooMany, ownerId), null);
  assert.equal(
    parseHomeworkSubmissionAttachments([{ ...attachment(1), size: HOMEWORK_FILE_MAX_BYTES + 1 }], ownerId),
    null,
  );
});

test("homework submission rejects unowned, duplicate, or renamed uploads", () => {
  const anotherOwner = "87654321-4321-4321-4321-cba987654321";
  assert.equal(parseHomeworkSubmissionAttachments([attachment(1)], anotherOwner), null);
  assert.equal(parseHomeworkSubmissionAttachments([attachment(1), attachment(1)], ownerId), null);
  assert.equal(
    parseHomeworkSubmissionAttachments([{ ...attachment(1), originalName: "renamed.docx" }], ownerId),
    null,
  );
});

test("homework upload types require a matching safe extension and MIME type", () => {
  assert.equal(isAllowedHomeworkFile("essay.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), true);
  assert.equal(isAllowedHomeworkFile("slides.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"), true);
  assert.equal(isAllowedHomeworkFile("notes.txt", "text/plain"), true);
  assert.equal(isAllowedHomeworkFile("malware.exe", "application/octet-stream"), false);
  assert.equal(isAllowedHomeworkFile("fake.pdf", "application/x-msdownload"), false);
});
