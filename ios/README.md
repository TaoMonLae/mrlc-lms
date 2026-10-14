# MRLC Focus for iPhone and iPad

Native, voluntary focus companion for school students. It uses the existing LMS focus-session API and keeps the learning site inside the app. It does not lock the device or restrict other apps. On personal devices, Guided Access remains controlled by the student or guardian.

## Development

Open `MRLCFocus.xcodeproj` in Xcode. The app targets iOS 17 or later and uses SwiftUI, WebKit, URLSession, and Keychain. No third-party packages are required. Choose the `MRLCFocus` scheme and an iPhone simulator or device. The app uses `https://gedmrlc.monrefugeelc.com`; it has no HTTP exception or development server setting.

For a TestFlight archive, sign in to the Apple developer team in Xcode, verify that `com.monrefugeelc.mrlcfocus` is available in the team, and use Product → Archive. Upload the archive through Xcode Organizer after testing sign in, MFA, focus status, release request, background/foreground reporting, and the learning tab on a real device. Create the app record and test group in App Store Connect before inviting external testers. Keep the signing account out of source control.

The app stores only its school bearer token in the device Keychain. It sends focus heartbeats while active and attempts a final status update when backgrounded. iOS may suspend that request; staff should treat stale heartbeat data as a connection or app-state signal, not proof that a student used another app. The learning tab embeds only the school HTTPS origin; external links open through the system.
