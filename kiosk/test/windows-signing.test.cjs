const test = require('node:test');
const assert = require('node:assert/strict');
const { windowsSigningConfig } = require('../windows-signing.cjs');

test('uses a hardware-backed certificate from the Windows store', () => {
  const config = windowsSigningConfig({ MRLC_WIN_CERT_SHA1: 'ab cd'.repeat(10) });
  assert.equal(config.thumbprint, 'ABCD'.repeat(10));
  assert.deepEqual(config.builderArgs, [`-c.win.signtoolOptions.certificateSha1=${config.thumbprint}`]);
});

test('keeps the legacy PFX route available', () => {
  assert.deepEqual(windowsSigningConfig({ WIN_CSC_LINK: 'cert.pfx', WIN_CSC_KEY_PASSWORD: 'secret' }), {
    thumbprint: '', builderArgs: [],
  });
});

test('refuses unsigned, incomplete, malformed, and ambiguous configurations', () => {
  for (const env of [
    {},
    { WIN_CSC_LINK: 'cert.pfx' },
    { WIN_CSC_KEY_PASSWORD: 'secret' },
    { MRLC_WIN_CERT_SHA1: 'not-a-thumbprint' },
    { MRLC_WIN_CERT_SHA1: 'A'.repeat(40), WIN_CSC_LINK: 'cert.pfx', WIN_CSC_KEY_PASSWORD: 'secret' },
  ]) {
    assert.throws(() => windowsSigningConfig(env));
  }
});
