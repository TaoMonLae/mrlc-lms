import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADMIN_NAV,
  NAVIGATION_ITEMS,
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

test('learning tools are grouped together and Daily Quest is learner-only', () => {
  for (const [role, entries] of Object.entries(ROLE_NAVS)) {
    const languageGroup = entries.find(
      (entry) => isNavGroup(entry) && entry.label === 'Learning Tools',
    );

    assert.ok(languageGroup && isNavGroup(languageGroup), `${role} is missing Learning Tools`);
    const expectedTitles = role === 'ADMIN'
      ? ['Learning Quest', 'Mon Language', 'Dictionary']
      : ['Daily Quest', 'Learning Quest', 'Mon Language', 'Dictionary'];
    assert.deepEqual(languageGroup.items.map((item) => item.title), expectedTitles);
    assert.equal(
      new Set(languageGroup.items.map((item) => item.icon)).size,
      languageGroup.items.length,
      `${role} language tools should use distinct icons`,
    );
  }

  const flatDailyQuest = NAVIGATION_ITEMS.find((item) => item.url === '/daily-quest');
  assert.deepEqual(flatDailyQuest?.roles, ['TEACHER', 'STUDENT']);
});

test('one Games link opens the game shelf; community retains its group', () => {
  for (const [role, entries] of Object.entries(ROLE_NAVS)) {
    const games = entries.find((entry) => !isNavGroup(entry) && entry.title === 'Games');
    const community = entries.find((entry) => isNavGroup(entry) && entry.label === 'Community');

    assert.ok(games && !isNavGroup(games), `${role} is missing Games`);
    assert.equal(games.url, '/games');
    assert.ok(community && isNavGroup(community), `${role} is missing Community`);
    assert.deepEqual(
      community.items.map((item) => item.title),
      ['Announcements', 'Chat', 'Social Space', 'News'],
    );
  }

  const flatWordTrail = NAVIGATION_ITEMS.find((item) => item.url === '/games/word-trail');
  assert.deepEqual(flatWordTrail?.roles, ['TEACHER', 'STUDENT']);
  const flatControls = NAVIGATION_ITEMS.find((item) => item.url === '/games/controls');
  assert.deepEqual(flatControls?.roles, ['ADMIN', 'TEACHER']);
});
