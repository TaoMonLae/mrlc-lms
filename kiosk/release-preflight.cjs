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
  const signing = present('WIN_CSC_LINK') || present('CSC_LINK');
  const password = present('WIN_CSC_KEY_PASSWORD') || present('CSC_KEY_PASSWORD');
  if (signing && password) process.exit(0);
  console.error('Windows release requires a code-signing certificate link and password. See kiosk/README.md.');
} else {
  console.error('Choose mac or win.');
}
process.exit(1);
