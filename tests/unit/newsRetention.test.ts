import assert from 'node:assert/strict';
import test from 'node:test';
import { registerNewsRoutes } from '../../news';

test('news cleanup gives GED resources a year while ordinary and uncategorized news expire after 30 days', async () => {
  let cleanup: any;
  const app: any = {};
  for (const method of ['get', 'post', 'put', 'delete']) app[method] = () => {};
  const { refreshAllSources } = registerNewsRoutes({
    app,
    prisma: {
      newsSource: { findMany: async () => [], create: async () => ({}) },
      newsArticle: { deleteMany: async (args: any) => { cleanup = args.where; } },
    },
    authMiddleware: () => {},
    requirePermission: () => () => {},
    createAuditLog: async () => {},
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  });
  const before = Date.now();
  await refreshAllSources();
  const after = Date.now();
  const [ged, news] = cleanup.OR;
  assert.deepEqual(ged.source, { category: { equals: 'GED', mode: 'insensitive' } });
  // Explicitly include null categories: SQL NOT comparisons alone exclude nulls.
  assert.deepEqual(news.source, {
    OR: [{ category: null }, { category: { not: 'GED', mode: 'insensitive' } }],
  });
  for (const [branch, days] of [[ged, 365], [news, 30]] as const) {
    const cutoff = branch.OR[0].publishedAt.lt.getTime();
    const age = days * 24 * 60 * 60 * 1000;
    assert.ok(cutoff >= before - age && cutoff <= after - age);
    // Undated stories use their original fetch date; dated stories keep their publication date.
    assert.equal(branch.OR[1].publishedAt, null);
    assert.equal(branch.OR[1].fetchedAt.lt.getTime(), cutoff);
  }
});
