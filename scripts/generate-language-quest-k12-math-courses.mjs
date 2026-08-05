import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const outputPath = path.resolve(process.cwd(), "curricula/language-quest/k12-math-courses.generated.json");
const courses = JSON.parse(await readFile(outputPath, "utf8"));
const allowed = new Set(["SELECT","ASSIST","CLOZE","ODD_ONE_OUT","REORDER","MATCHING","MINIMAL_PAIR_LISTENING","DICTATION","GRAMMAR_TRANSFORM"]);
if (!Array.isArray(courses) || courses.length !== 13) throw new Error("Expected 13 K-12 mathematics courses");
let units=0, lessons=0, challenges=0, options=0;
for (const course of courses) {
  if (course.category !== "Mathematics Courses" || course.imageEmoji !== "") throw new Error(`${course.code} metadata is invalid`);
  if (course.units.length !== 8) throw new Error(`${course.code} must contain 8 units`);
  for (const unit of course.units) {
    units += 1;
    if (unit.lessons.length !== 3) throw new Error(`${unit.title} must contain 3 lessons`);
    for (const lesson of unit.lessons) {
      lessons += 1;
      if (lesson.challenges.length !== 6) throw new Error(`${lesson.title} must contain 6 challenges`);
      for (const challenge of lesson.challenges) {
        challenges += 1;
        if (!challenge.question?.trim() || !challenge.explanation?.trim()) throw new Error("Math challenges require a question and teaching explanation");
        if (!allowed.has(challenge.type)) throw new Error(`Unsupported type ${challenge.type}`);
        const optionTexts = challenge.options.map((option) => option.text.trim().toLowerCase());
        if (new Set(optionTexts).size !== optionTexts.length) throw new Error(`${course.code}: duplicate option text in ${challenge.question}`);
        const correct = challenge.options.filter((option) => option.correct).length;
        if (challenge.type === "MATCHING" || challenge.type === "REORDER") {
          if (correct !== challenge.options.length) throw new Error(`${challenge.type} options must all be correct`);
        } else if (correct !== 1) throw new Error(`${challenge.type} must have exactly one correct option`);
        if (challenge.options.some((option) => option.emoji !== null || option.audioText !== null)) throw new Error("Math options must be emoji-free and silent");
        options += challenge.options.length;
      }
    }
  }
}
const text = JSON.stringify(courses, null, 2) + "\n";
if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text)) throw new Error("Emoji found in K-12 mathematics curriculum");
await writeFile(outputPath, text, "utf8");
console.log(`Validated ${courses.length} courses, ${units} units, ${lessons} lessons, ${challenges} challenges, and ${options} options`);
