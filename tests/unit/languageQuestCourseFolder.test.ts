import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageQuestCourseFolders } from '../../src/components/games/LanguageQuestCourseFolder';

test('course folders start closed and do not render a course panel automatically', () => {
  const html = renderToStaticMarkup(createElement(LanguageQuestCourseFolders, {
    groups: [{ category: 'English', courses: [{ id: 'course-1', title: 'GED RLA' }] }],
    renderCourse: (course: { id: string; title: string }) => createElement('p', { key: course.id }, course.title),
  }));

  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /Open English folder/);
  assert.match(html, /col-span-2/);
  assert.doesNotMatch(html, /GED RLA/);
  assert.doesNotMatch(html, /course-folder-panel/);
});
