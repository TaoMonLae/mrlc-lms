const { windowsSigningConfig } = require('./windows-signing.cjs');

const target = process.argv[2];
const present = (name) => Boolean(process.env[name]?.trim());

if (target === 'mac') {
  const signing = present('CSC_LINK') || present('CSC_NAME');
  const notarization =
    (present('APPLE_API_KEY') && present('APPLE_API_KEY_ID') && present('APPLE_API_ISSUER')) ||
    (present('APPLE_ID') && present('APPLE_APP_SPECIFIC_PASSWORD') && present('APPLE_TEAM_ID')) ||
    (present('APPLE_KEYCHAIN') && present('APPLE_KEYCHAIN_PROFILE'));
  if (signing && notarization) process.exit(0);
  console.error('macOS release requires a Developer ID signing identity and Apple notarization credentials. See kiosk/README.md.');
} else if (target === 'win') {
  try {
    windowsSigningConfig(process.env);
    process.exit(0);
  } catch (error) {
    console.error(error.message);
  }
} else {
  console.error('Choose mac or win.');
}
process.exit(1);
