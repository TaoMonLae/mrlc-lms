import test from 'node:test';
import assert from 'node:assert/strict';
import { getYouTubeVideoId, getVideoEmbedUrl, isValidVideoSourceUrl, normalizeVideoSourceUrl } from '../../shared/videoSource';
import { getVideoThumbnailUrl } from '../../src/lib/video';

const id = '-mzqQ_vNiKg';
test('the reported cave lesson URL plays even when pasted with its title', () => {
  for (const value of [`https://www.youtube.com/watch?v=${id} DO NOT ENTER CAVES or LAVA TUBES!`, `https://www.youtube.com/watch?v=${id}%20DO%20NOT%20ENTER`, `https://youtu.be/${id} Video title`]) {
    assert.equal(getYouTubeVideoId(value), id);
    assert.equal(normalizeVideoSourceUrl(value), `https://www.youtube.com/watch?v=${id}`);
    assert.equal(getVideoEmbedUrl(value), `https://www.youtube.com/embed/${id}?rel=0&playsinline=1`);
    assert.equal(getVideoThumbnailUrl(value), `https://img.youtube.com/vi/${id}/hqdefault.jpg`);
    assert.equal(isValidVideoSourceUrl(value), true);
  }
});
test('YouTube watch, mobile, privacy, shorts, live and short-link formats share one parser', () => {
  for (const value of [`https://m.youtube.com/watch?v=${id}&feature=share`, `https://www.youtube-nocookie.com/embed/${id}`, `https://youtube.com/shorts/${id}`, `https://youtube.com/live/${id}`, `https://youtu.be/${id}?si=share`]) assert.equal(getYouTubeVideoId(value), id);
});
test('invalid IDs and lookalike domains never become YouTube embeds', () => {
  for (const value of ['https://youtube.com/watch?v=short', `https://youtube.com/watch?v=${id}X`, `https://notyoutube.com/watch?v=${id}`, `https://youtube.com.evil.test/watch?v=${id}`, 'javascript:alert(1)', 'https://youtube.com/playlist?list=abc']) assert.equal(getVideoEmbedUrl(value), null);
  assert.equal(isValidVideoSourceUrl('https://youtube.com/watch?v=short'), false);
  assert.equal(isValidVideoSourceUrl('javascript:alert(1)'), false);
});
test('start timestamps survive normalization and embedding', () => {
  assert.equal(normalizeVideoSourceUrl(`https://youtu.be/${id}?t=1m30s Video title`), `https://www.youtube.com/watch?v=${id}&t=90s`);
  assert.equal(getVideoEmbedUrl(`https://youtu.be/${id}?start=120`), `https://www.youtube.com/embed/${id}?rel=0&playsinline=1&start=120`);
});
test('uploaded videos and Vimeo retain their source behavior', () => {
  assert.equal(isValidVideoSourceUrl('/uploads/videos/test.mp4'), true);
  assert.equal(isValidVideoSourceUrl('/uploads/videos/../test.mp4'), false);
  assert.equal(normalizeVideoSourceUrl(' https://example.test/video.mp4 '), 'https://example.test/video.mp4');
  assert.equal(getVideoEmbedUrl('https://player.vimeo.com/video/123456789?h=abc123'), 'https://player.vimeo.com/video/123456789?h=abc123');
});
