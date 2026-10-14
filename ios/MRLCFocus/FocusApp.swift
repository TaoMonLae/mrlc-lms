import SwiftUI

@main
struct MRLCFocusApp: App {
    @StateObject private var model = FocusModel()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView(model: model)
                .preferredColorScheme(.light)
                .task { await model.restore() }
                .onChange(of: scenePhase) { _, phase in
                    guard model.student != nil else { return }
                    if phase == .active {
                        Task {
                            await model.refreshSession()
                            await model.sendHeartbeat(focused: true)
                        }
                    } else if phase == .background {
                        // iOS can suspend this request. The server also uses the last
                        // heartbeat time, so this is only a best-effort status update.
                        Task { await model.sendHeartbeat(focused: false) }
                    }
                }
        }
    }
}
