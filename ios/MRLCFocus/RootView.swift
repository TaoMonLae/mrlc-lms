import SwiftUI
import WebKit

private enum Palette {
    static let ink = Color(red: 0.06, green: 0.17, blue: 0.23)
    static let teal = Color(red: 0.05, green: 0.45, blue: 0.42)
    static let mist = Color(red: 0.92, green: 0.96, blue: 0.94)
    static let amber = Color(red: 0.72, green: 0.36, blue: 0.08)
}

struct RootView: View {
    @ObservedObject var model: FocusModel
    @Environment(\.scenePhase) private var scenePhase
    @State private var selectedTab = 0

    var body: some View {
        Group {
            if model.checking {
                ProgressView("Restoring your school session…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Palette.mist)
            } else if model.student == nil {
                SignInView(model: model)
            } else {
                TabView(selection: $selectedTab) {
                    FocusHome(model: model, openLearning: { selectedTab = 1 })
                        .tabItem { Label("Focus", systemImage: "timer") }
                        .tag(0)
                    LearningView(model: model)
                        .tabItem { Label("Learning", systemImage: "book.closed") }
                        .tag(1)
                }
                .tint(Palette.teal)
                .task(id: scenePhase) {
                    guard scenePhase == .active else { return }
                    while !Task.isCancelled && model.student != nil {
                        await model.refreshSession()
                        await model.sendHeartbeat(focused: true)
                        try? await Task.sleep(for: .seconds(15))
                    }
                }
            }
        }
    }
}

private struct SignInView: View {
    @ObservedObject var model: FocusModel
    @State private var identifier = ""
    @State private var password = ""
    @State private var mfaCode = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Image(systemName: "heart.text.square.fill")
                    .font(.system(size: 38))
                    .foregroundStyle(Palette.teal)
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 9) {
                    Text("MRLC FOCUS")
                        .font(.caption.weight(.bold)).tracking(2)
                        .foregroundStyle(Palette.teal)
                    Text("Make space for learning.")
                        .font(.largeTitle.bold())
                        .foregroundStyle(Palette.ink)
                    Text("Sign in with your school student account to see your assigned focus session.")
                        .foregroundStyle(.secondary)
                }
                VStack(alignment: .leading, spacing: 16) {
                    TextField("Email or username", text: $identifier)
                        .textContentType(.username)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.emailAddress)
                        .textFieldStyle(.roundedBorder)
                        .accessibilityLabel("School email or username")
                    SecureField("Password", text: $password)
                        .textContentType(.password)
                        .textFieldStyle(.roundedBorder)
                    if model.mfaRequired {
                        TextField("Authentication code", text: $mfaCode)
                            .textContentType(.oneTimeCode)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .textFieldStyle(.roundedBorder)
                    }
                    Button {
                        Task { await model.signIn(identifier: identifier.trimmingCharacters(in: .whitespaces), password: password, mfaCode: mfaCode) }
                    } label: {
                        HStack {
                            if model.busy { ProgressView().tint(.white) }
                            Text(model.busy ? "Signing in…" : "Sign in")
                            Spacer()
                            Image(systemName: "arrow.right")
                        }
                        .font(.headline)
                        .padding(16)
                        .foregroundStyle(.white)
                        .background(Palette.ink, in: RoundedRectangle(cornerRadius: 15))
                    }
                    .disabled(model.busy || identifier.isEmpty || password.isEmpty || (model.mfaRequired && mfaCode.isEmpty))
                }
                .padding(20)
                .background(.white, in: RoundedRectangle(cornerRadius: 22))
                if let message = model.message {
                    Label(message, systemImage: "exclamationmark.circle")
                        .font(.subheadline)
                        .foregroundStyle(Palette.amber)
                        .accessibilityAddTraits(.updatesFrequently)
                }
                Text("This is a voluntary focus companion. It can report whether the app is active, but it cannot lock your iPhone or block other apps.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            .padding(24)
            .frame(maxWidth: 540)
            .frame(maxWidth: .infinity)
        }
        .background(Palette.mist)
    }
}

private struct FocusHome: View {
    @ObservedObject var model: FocusModel
    let openLearning: () -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    VStack(alignment: .leading, spacing: 5) {
                        Text("Hello, \(model.student?.name ?? "student").")
                            .font(.largeTitle.bold())
                            .foregroundStyle(Palette.ink)
                        Text("Your focus space is ready when your school session starts.")
                            .foregroundStyle(.secondary)
                    }
                    .padding(.bottom, 4)

                    if model.student?.mustChangePassword == true {
                        StatusCard(symbol: "lock.rotation", title: "Change your school password", detail: "Open Learning to finish this account step, then refresh your account here.")
                        Button("Refresh account") { Task { await model.refreshAccount() } }
                            .buttonStyle(.borderedProminent)
                    } else if let session = model.session {
                        SessionCard(session: session, busy: model.busy, openLearning: openLearning) {
                            Task { await model.requestRelease() }
                        }
                    } else {
                        StatusCard(symbol: "clock.badge.questionmark", title: "Checking your assignment", detail: "Keep this app open while we confirm your focus session with the school.")
                    }

                    if let message = model.message {
                        Label(message, systemImage: "wifi.exclamationmark")
                            .font(.subheadline)
                            .foregroundStyle(Palette.amber)
                            .padding(16)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(.white, in: RoundedRectangle(cornerRadius: 16))
                            .accessibilityAddTraits(.updatesFrequently)
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        Label("Your device stays yours", systemImage: "iphone.gen3")
                            .font(.headline)
                            .foregroundStyle(Palette.ink)
                        Text("Teachers can see focus and connection status during an assigned session. You can still leave or close the app. Guided Access, if used, is controlled on your device.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        if let lastSync = model.lastSync {
                            Text("Last connected \(lastSync.formatted(date: .omitted, time: .shortened))")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(18)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(.white, in: RoundedRectangle(cornerRadius: 18))
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Palette.mist)
            .navigationTitle("Focus")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button("Refresh session", systemImage: "arrow.clockwise") { Task { await model.refreshSession() } }
                        Button("Sign out", systemImage: "rectangle.portrait.and.arrow.right", role: .destructive) {
                            Task { await model.signOut() }
                        }
                    } label: { Image(systemName: "ellipsis.circle") }
                    .accessibilityLabel("Focus options")
                }
            }
            .refreshable { await model.refreshSession() }
        }
    }
}

private struct SessionCard: View {
    let session: FocusSession
    let busy: Bool
    let openLearning: () -> Void
    let requestRelease: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Label(session.isActive ? "Assigned session active" : "Session finished", systemImage: session.isActive ? "circle.fill" : "checkmark.circle.fill")
                .font(.caption.weight(.bold))
                .foregroundStyle(session.isActive ? Palette.teal : .secondary)
            if session.isActive, let endDate = session.endDate {
                TimelineView(.periodic(from: .now, by: 1)) { context in
                    let seconds = max(0, Int(ceil(endDate.timeIntervalSince(context.date))))
                    Text(String(format: "%02d:%02d", seconds / 60, seconds % 60))
                        .font(.system(size: 58, weight: .semibold, design: .rounded).monospacedDigit())
                        .foregroundStyle(Palette.ink)
                        .contentTransition(.numericText())
                        .accessibilityLabel("\(seconds / 60) minutes and \(seconds % 60) seconds remaining")
                }
                Text("Keep learning in the app. Your teacher can adjust the end time.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                Text("You're finished for now.")
                    .font(.title2.bold())
                    .foregroundStyle(Palette.ink)
                Text("Your teacher released the session or its assigned time ended.")
                    .foregroundStyle(.secondary)
            }
            Button(action: openLearning) {
                Label("Open learning", systemImage: "arrow.right")
                    .frame(maxWidth: .infinity)
                    .padding(14)
            }
            .buttonStyle(.borderedProminent)
            .tint(Palette.ink)
            if session.isActive {
                Button(action: requestRelease) {
                    Text(session.releaseRequestedAt == nil ? "Request release" : "Release requested")
                        .frame(maxWidth: .infinity)
                        .padding(8)
                }
                .buttonStyle(.bordered)
                .disabled(busy || session.releaseRequestedAt != nil)
            }
        }
        .padding(22)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.white, in: RoundedRectangle(cornerRadius: 22))
    }
}

private struct StatusCard: View {
    let symbol: String
    let title: String
    let detail: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Image(systemName: symbol).font(.title).foregroundStyle(Palette.teal)
            Text(title).font(.title2.bold()).foregroundStyle(Palette.ink)
            Text(detail).foregroundStyle(.secondary)
        }
        .padding(22)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.white, in: RoundedRectangle(cornerRadius: 22))
    }
}

private struct LearningView: View {
    @ObservedObject var model: FocusModel

    var body: some View {
        NavigationStack {
            Group {
                if let token = model.token {
                    LMSWebView(token: token, path: model.student?.mustChangePassword == true ? "/change-password" : "/student/dashboard")
                        .id(token)
                        .ignoresSafeArea(edges: .bottom)
                } else {
                    ContentUnavailableView("Sign in needed", systemImage: "person.crop.circle.badge.questionmark")
                }
            }
            .navigationTitle("Learning")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

private struct LMSWebView: UIViewRepresentable {
    let token: String
    let path: String

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let controller = WKUserContentController()
        let encodedToken = String(data: try! JSONSerialization.data(withJSONObject: token, options: .fragmentsAllowed), encoding: .utf8)!
        controller.addUserScript(WKUserScript(
            source: "sessionStorage.setItem('auth_token', \(encodedToken));",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        ))
        let configuration = WKWebViewConfiguration()
        configuration.userContentController = controller
        configuration.websiteDataStore = .default()
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.navigationDelegate = context.coordinator
        view.allowsBackForwardNavigationGestures = true
        view.load(URLRequest(url: FocusModel.origin.appending(path: path)))
        return view
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = action.request.url else { decisionHandler(.cancel); return }
            if action.targetFrame?.isMainFrame == false || url.scheme == "about" {
                decisionHandler(.allow)
            } else if url.scheme == "https", url.host == FocusModel.origin.host {
                if action.targetFrame == nil { webView.load(URLRequest(url: url)); decisionHandler(.cancel) }
                else { decisionHandler(.allow) }
            } else {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
            }
        }
    }
}
