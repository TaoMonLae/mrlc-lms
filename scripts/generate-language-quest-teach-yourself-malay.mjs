import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const sourcePath = path.resolve(process.cwd(), "curricula/sources/teach-yourself-malay/course-blueprint.json");
const outputPath = path.resolve(process.cwd(), "curricula/language-quest/teach-yourself-malay.generated.json");
const blueprint = JSON.parse(await readFile(sourcePath, "utf8"));
const course = blueprint.course;

if (!course || !Array.isArray(course.units) || course.units.length !== 17) {
  throw new Error("Teach Yourself Malay must contain 17 units");
}
if (course.imageEmoji !== "") throw new Error("The course must remain emoji-free");
const lessons = course.units.flatMap((unit) => unit.lessons || []);
const challenges = lessons.flatMap((lesson) => lesson.challenges || []);
if (lessons.length !== 68 || challenges.length !== 408) {
  throw new Error(`Expected 68 lessons and 408 challenges, found ${lessons.length} and ${challenges.length}`);
}
for (const challenge of challenges) {
  if (!["SELECT", "ASSIST"].includes(challenge.type)) throw new Error("Unsupported challenge type");
  if (!Array.isArray(challenge.options) || challenge.options.length < 2 || challenge.options.length > 6) {
    throw new Error("Each challenge needs 2-6 options");
  }
  if (challenge.options.filter((option) => option.correct).length !== 1) {
    throw new Error("Each challenge needs exactly one correct option");
  }
  if (challenge.options.some((option) => option.emoji !== null || option.audioText !== option.text)) {
    throw new Error("Options must be emoji-free and speak their visible Malay text");
  }
}
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(course, null, 2)}\n`, "utf8");
console.log(`Generated Teach Yourself Malay: ${course.units.length} units, ${lessons.length} lessons, ${challenges.length} challenges`);
