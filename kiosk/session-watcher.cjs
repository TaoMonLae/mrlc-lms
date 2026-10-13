const { isReleasedStatus } = require('./policy.cjs');

function createSessionWatcher({ isLmsPage, readToken, fetchCurrent, fetchWatch, onRelease }) {
  let binding = null;
  let busy = false;
  return {
    async poll() {
      if (busy) return;
      busy = true;
      try {
        if (!binding) {
          if (!isLmsPage()) return;
          const token = await readToken();
          if (typeof token !== 'string' || token.length < 20) return;
          const data = await fetchCurrent(token);
          if (!data || typeof data.id !== 'string' || !/^[a-f0-9]{64}$/.test(data.watchToken || '')) return;
          // Keep the first student's session, even if the web page changes accounts.
          binding = { sessionId: data.id, token: data.watchToken };
          if (isReleasedStatus(data.status)) onRelease();
        } else {
          const data = await fetchWatch(binding);
          if (isReleasedStatus(data?.status)) onRelease();
        }
      } catch { /* no network means no automatic release */ }
      finally { busy = false; }
    },
    getBinding() { return binding && { ...binding }; },
  };
}

module.exports = { createSessionWatcher };
