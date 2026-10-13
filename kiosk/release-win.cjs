const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { windowsSigningConfig } = require('./windows-signing.cjs');

if (process.platform !== 'win32') {
  console.error('Build the signed Windows release on a trusted Windows computer.');
  process.exit(1);
}

let signing;
try {
  signing = windowsSigningConfig(process.env);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const installer = path.join(__dirname, 'release', `MRLC-LMS-Kiosk-${require('./package.json').version}-win-x64.exe`);
const app = path.join(__dirname, 'release', 'win-unpacked', 'MRLC LMS Kiosk.exe');
fs.rmSync(installer, { force: true });

const build = spawnSync(process.execPath, [
  require.resolve('electron-builder/cli.js'),
  '--win', 'nsis', '--x64', '--publish', 'never',
  '-c.forceCodeSigning=true',
  ...signing.builderArgs,
], { stdio: 'inherit', cwd: __dirname });

if (build.error || build.status !== 0) {
  console.error(build.error?.message || 'Windows release build failed.');
  process.exit(build.status || 1);
}

const verify = spawnSync('powershell.exe', [
  '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
  '-File', path.join(__dirname, 'verify-windows-signatures.ps1'),
  '-AppPath', app,
  '-InstallerPath', installer,
  '-ExpectedThumbprint', signing.thumbprint,
], { stdio: 'inherit', cwd: __dirname });

if (verify.error || verify.status !== 0) {
  fs.rmSync(installer, { force: true });
  console.error(verify.error?.message || 'Windows release signature verification failed.');
  process.exit(verify.status || 1);
}
