# MRLC Focus for iPhone and iPad

Native, voluntary focus companion for school students. It uses the existing LMS focus-session API and keeps the learning site inside the app. It does not lock the device or restrict other apps. On personal devices, Guided Access remains controlled by the student or guardian.

## Development

Open `MRLCFocus.xcodeproj` in Xcode. The app targets iOS 17 or later and uses SwiftUI, WebKit, URLSession, and Keychain. No third-party packages are required. Choose the `MRLCFocus` scheme and an iPhone simulator or device. The app uses `https://gedmrlc.monrefugeelc.com`; it has no HTTP exception or development server setting.

## TestFlight build

Sign in to the Apple developer team in Xcode. Xcode may request a registered iPhone when it tries to sign an archive for development. An App Store Connect export does not require a device ID. Build an unsigned archive, then let Xcode sign the exported IPA with the team's cloud managed Apple Distribution certificate and App Store provisioning profile:

```sh
xcodebuild -project ios/MRLCFocus.xcodeproj -scheme MRLCFocus \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath ios/build/MRLCFocus.xcarchive \
  CODE_SIGNING_ALLOWED=NO archive

xcodebuild -exportArchive -archivePath ios/build/MRLCFocus.xcarchive \
  -exportPath ios/build/export \
  -exportOptionsPlist ios/ExportOptions.plist \
  -allowProvisioningUpdates
```

Create the app record in App Store Connect for bundle ID `com.monrefugeelc.mrlcfocus` before uploading the IPA. The exported IPA is at `ios/build/export/MRLCFocus.ipa`. Upload it through Xcode, Transporter, or App Store Connect tooling, then create a TestFlight group. Test sign in, MFA, focus status, release request, background/foreground reporting, and the learning tab on a real device before inviting external testers. Keep signing credentials and build artifacts out of source control.

The app stores only its school bearer token in the device Keychain. It sends focus heartbeats while active and attempts a final status update when backgrounded. iOS may suspend that request; staff should treat stale heartbeat data as a connection or app-state signal, not proof that a student used another app. The learning tab embeds only the school HTTPS origin; external links open through the system.
