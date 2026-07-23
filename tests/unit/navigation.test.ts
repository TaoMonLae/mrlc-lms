import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADMIN_NAV,
  STUDENT_NAV,
  TEACHER_NAV,
  isNavGroup,
  type AdminNavEntry,
} from '../../src/lib/navigation';

const ROLE_NAVS: Record<string, AdminNavEntry[]> = {
  ADMIN: ADMIN_NAV,
  TEACHER: TEACHER_NAV,
  STUDENT: STUDENT_NAV,
};

test('grouped navigation keeps labels and destinations unique for each role', () => {
  for (const [role, entries] of Object.entries(ROLE_NAVS)) {
    const labels = entries.map((entry) => isNavGroup(entry) ? entry.label : entry.title);
    const urls = entries.flatMap((entry) => isNavGroup(entry)
      ? entry.items.map((item) => item.url)
      : [entry.url]);

    assert.equal(new Set(labels).size, labels.length, `${role} contains duplicate navigation labels`);
    assert.equal(new Set(urls).size, urls.length, `${role} contains duplicate navigation destinations`);
  }
});

test('language tools are grouped together with distinct icons', () => {
  for (const [role, entries] of Object.entries(ROLE_NAVS)) {
    const languageGroup = entries.find(
      (entry) => isNavGroup(entry) && entry.label === 'Language Learning',
    );

    assert.ok(languageGroup && isNavGroup(languageGroup), `${role} is missing Language Learning`);
    assert.deepEqual(
      languageGroup.items.map((item) => item.title),
      ['Language Quest', 'Mon Language', 'Dictionary'],
    );
    assert.equal(
      new Set(languageGroup.items.map((item) => item.icon)).size,
      languageGroup.items.length,
      `${role} language tools should use distinct icons`,
    );
  }
});

test('games and community links live in their own focused groups', () => {
  for (const [role, entries] of Object.entries(ROLE_NAVS)) {
    const games = entries.find((entry) => isNavGroup(entry) && entry.label === 'Games');
    const community = entries.find((entry) => isNavGroup(entry) && entry.label === 'Community');

    assert.ok(games && isNavGroup(games), `${role} is missing Games`);
    assert.ok(community && isNavGroup(community), `${role} is missing Community`);
    assert.deepEqual(
      games.items.map((item) => item.title),
      ['Snake Game', 'Sudoku', 'Checkers', 'Chess'],
    );
    assert.deepEqual(
      community.items.map((item) => item.title),
      ['Announcements', 'Chat', 'Social Space', 'News'],
    );
  }
});
