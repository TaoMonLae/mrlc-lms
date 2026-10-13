function windowsSigningConfig(env) {
  const thumbprint = env.MRLC_WIN_CERT_SHA1?.trim().replace(/\s/g, '').toUpperCase();
  const link = (env.WIN_CSC_LINK || env.CSC_LINK)?.trim();
  const password = env.WIN_CSC_KEY_PASSWORD || env.CSC_KEY_PASSWORD;

  if (thumbprint) {
    if (!/^[0-9A-F]{40}$/.test(thumbprint)) {
      throw new Error('MRLC_WIN_CERT_SHA1 must be a 40-character certificate thumbprint. See kiosk/README.md.');
    }
    if (link || password) {
      throw new Error('Choose either MRLC_WIN_CERT_SHA1 or a PFX link and password, not both.');
    }
    return { thumbprint, builderArgs: [`-c.win.signtoolOptions.certificateSha1=${thumbprint}`] };
  }

  if (link && password) return { thumbprint: '', builderArgs: [] };
  throw new Error('Windows release requires MRLC_WIN_CERT_SHA1 for a token-backed certificate, or a PFX link and password. See kiosk/README.md.');
}

module.exports = { windowsSigningConfig };
