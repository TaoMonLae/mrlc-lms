import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageQuestCourseFolders } from '../../src/components/games/LanguageQuestCourseFolder';

test('course categories expose the first course group immediately', () => {
  const html = renderToStaticMarkup(createElement(LanguageQuestCourseFolders, {
    groups: [{ category: 'English', courses: [{ id: 'course-1', title: 'GED RLA' }] }],
    renderCourse: (course: { id: string; title: string }) => createElement('p', { key: course.id }, course.title),
  }));

  assert.match(html, /role="tablist"/);
  assert.match(html, /aria-selected="true"/);
  assert.match(html, /Now browsing/);
  assert.match(html, /GED RLA/);
  assert.match(html, /course-folder-panel/);
});
