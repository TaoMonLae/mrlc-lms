import fs from 'fs';
import path from 'path';

const workspaceDir = '/Users/taomonlae/Downloads/mrlc-lms';
const curriculaDir = path.join(workspaceDir, 'curricula', 'language-quest');

const strings = new Set();

function addString(str) {
  if (str && typeof str === 'string') {
    const trimmed = str.replace(/\s+/g, ' ').trim();
    if (trimmed && trimmed.length > 1) {
      strings.add(trimmed);
    }
  }
}

// 1. Read JSON files under curricula/language-quest
const jsonFiles = fs.readdirSync(curriculaDir).filter(f => f.endsWith('.json'));
for (const file of jsonFiles) {
  const content = JSON.parse(fs.readFileSync(path.join(curriculaDir, file), 'utf8'));
  const courses = Array.isArray(content) ? content : [content];
  for (const course of courses) {
    addString(course.title);
    addString(course.description);
    if (course.units) {
      for (const unit of course.units) {
        addString(unit.title);
        addString(unit.description);
        if (unit.lessons) {
          for (const lesson of unit.lessons) {
            addString(lesson.title);
            addString(lesson.description);
          }
        }
      }
    }
  }
}

// 2. Parse starter course and hardcoded courses from TS files in root
// Since we don't want to parse full TS files, we can extract them via regex or simple imports if possible.
// Let's read the files as text and match title and description fields.
const tsFiles = [
  'languageQuest.ts',
  'languageQuestImportedCourses.ts',
  'languageQuestMandarinCourse.ts',
  'languageQuestChineseConversationCourse.ts'
];

for (const file of tsFiles) {
  const filePath = path.join(workspaceDir, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    // Match fields: title: "...", description: "..."
    const titleMatches = content.matchAll(/\btitle:\s*(['"`])((?:\\.|[^\\])*?)\1/g);
    for (const m of titleMatches) {
      addString(m[2]);
    }
    const descMatches = content.matchAll(/\bdescription:\s*(['"`])((?:\\.|[^\\])*?)\1/g);
    for (const m of descMatches) {
      addString(m[2]);
    }
  }
}

const sortedStrings = Array.from(strings).sort();
fs.writeFileSync(path.join(workspaceDir, 'scratch', 'course_strings.json'), JSON.stringify(sortedStrings, null, 2), 'utf8');
console.log(`Extracted ${sortedStrings.length} unique course strings.`);
