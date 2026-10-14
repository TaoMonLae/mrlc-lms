import Foundation
import Security
import WebKit

struct Student: Decodable {
    let id: String
    let firstName: String?
    let lastName: String?
    let role: String
    let isExternalLearner: Bool
    let mustChangePassword: Bool

    var name: String {
        let joined = [firstName, lastName].compactMap { $0 }.joined(separator: " ").trimmingCharacters(in: .whitespaces)
        return joined.isEmpty ? "Student" : joined
    }
}

struct FocusSession: Decodable {
    let id: String
    let endsAt: String
    let status: String
    let releaseRequestedAt: String?

    var endDate: Date? {
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return fractional.date(from: endsAt) ?? ISO8601DateFormatter().date(from: endsAt)
    }

    var isActive: Bool { status == "ACTIVE" && (endDate ?? .distantPast) > .now }
}

private struct LoginResponse: Decodable {
    let token: String?
    let mfaRequired: Bool?
}

private struct MeResponse: Decodable { let user: Student }
private struct ErrorResponse: Decodable { let error: String? }

enum FocusAPIError: LocalizedError {
    case message(String)
    var errorDescription: String? {
        if case let .message(value) = self { return value }
        return nil
    }
}

enum TokenStore {
    private static let account = "mrlc-focus-student"
    private static let service = "com.monrefugeelc.mrlcfocus"

    static func read() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: account,
            kSecAttrService as String: service,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func save(_ token: String) throws {
        delete()
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: account,
            kSecAttrService as String: service,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
            kSecValueData as String: Data(token.utf8)
        ]
        guard SecItemAdd(query as CFDictionary, nil) == errSecSuccess else {
            throw FocusAPIError.message("Could not securely save your session on this device.")
        }
    }

    static func delete() {
        SecItemDelete([
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: account,
            kSecAttrService as String: service
        ] as CFDictionary)
    }
}

@MainActor
final class FocusModel: ObservableObject {
    static let origin = URL(string: "https://gedmrlc.monrefugeelc.com")!

    @Published private(set) var checking = true
    @Published private(set) var busy = false
    @Published private(set) var student: Student?
    @Published private(set) var session: FocusSession?
    @Published private(set) var mfaRequired = false
    @Published private(set) var message: String?
    @Published private(set) var lastSync: Date?
    private(set) var token: String?
    private var refreshing = false
    private var sendingHeartbeat = false

    private let client: URLSession = {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 15
        configuration.waitsForConnectivity = false
        return URLSession(configuration: configuration)
    }()

    func restore() async {
        guard checking else { return }
        if !UserDefaults.standard.bool(forKey: "mrlcFocusHasLaunched") {
            // Keychain items can survive an uninstall. A fresh installation
            // should always ask the student to sign in again.
            TokenStore.delete()
            UserDefaults.standard.set(true, forKey: "mrlcFocusHasLaunched")
        }
        token = TokenStore.read()
        defer { checking = false }
        guard token != nil else { return }
        do {
            try await loadStudent()
            await refreshSession()
        } catch {
            if isAuthFailure(error) { clearLocalSession() }
            else { message = "Cannot reach the school server. Pull to retry when connected." }
        }
    }

    func signIn(identifier: String, password: String, mfaCode: String) async {
        guard !busy else { return }
        busy = true
        message = nil
        defer { busy = false }
        do {
            let response: LoginResponse = try await request(
                "/api/auth/login", method: "POST",
                body: ["identifier": identifier, "password": password, "rememberMe": false, "mfaCode": mfaCode],
                authenticated: false
            )
            if response.mfaRequired == true {
                mfaRequired = true
                message = "Enter the authentication code for this account."
                return
            }
            guard let newToken = response.token else { throw FocusAPIError.message("Sign in did not return a session.") }
            try TokenStore.save(newToken)
            token = newToken
            try await loadStudent()
            mfaRequired = false
            await refreshSession()
        } catch {
            message = error.localizedDescription
        }
    }

    func refreshAccount() async {
        do {
            try await loadStudent()
            await refreshSession()
        } catch { message = error.localizedDescription }
    }

    func refreshSession() async {
        guard let student, !student.mustChangePassword, !refreshing else { return }
        refreshing = true
        defer { refreshing = false }
        do {
            let current: FocusSession? = try await request("/api/focus/session")
            if let current {
                session = current
            } else {
                session = try await request("/api/focus/session", method: "POST")
            }
            lastSync = .now
            message = nil
        } catch {
            if isAuthFailure(error) { clearLocalSession() }
            else { message = "Focus status could not reach the school server. Reconnect and retry." }
        }
    }

    func sendHeartbeat(focused: Bool) async {
        guard token != nil, session?.isActive == true, !sendingHeartbeat else { return }
        sendingHeartbeat = true
        defer { sendingHeartbeat = false }
        do {
            let updated: FocusSession = try await request(
                "/api/focus/heartbeat", method: "POST",
                body: ["focused": focused, "fullscreen": false, "presentationMode": "WEB_APP"]
            )
            session = updated
            lastSync = .now
            message = nil
        } catch {
            if isAuthFailure(error) { clearLocalSession() }
            else { message = "Focus status could not reach the school server. Reconnect and retry." }
        }
    }

    func requestRelease() async {
        guard !busy, session?.isActive == true else { return }
        busy = true
        defer { busy = false }
        do {
            session = try await request("/api/focus/release-request", method: "POST")
            lastSync = .now
            message = nil
        } catch { message = error.localizedDescription }
    }

    func signOut() async {
        if token != nil {
            let _: EmptyResponse? = try? await request("/api/auth/logout", method: "POST")
        }
        clearLocalSession()
    }

    private func loadStudent() async throws {
        let response: MeResponse = try await request("/api/auth/me")
        guard response.user.role == "STUDENT", !response.user.isExternalLearner else {
            clearLocalSession()
            throw FocusAPIError.message("Use a school student account for MRLC Focus.")
        }
        student = response.user
    }

    private func clearLocalSession() {
        TokenStore.delete()
        token = nil
        student = nil
        session = nil
        mfaRequired = false
        lastSync = nil
        WKWebsiteDataStore.default().removeData(
            ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(),
            modifiedSince: .distantPast
        ) {}
    }

    private func isAuthFailure(_ error: Error) -> Bool {
        if case FocusAPIError.message("Please sign in again.") = error { return true }
        return false
    }

    private struct EmptyResponse: Decodable {}

    private func request<T: Decodable>(
        _ path: String,
        method: String = "GET",
        body: [String: Any]? = nil,
        authenticated: Bool = true
    ) async throws -> T {
        var request = URLRequest(url: Self.origin.appending(path: path))
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.cachePolicy = .reloadIgnoringLocalCacheData
        if authenticated {
            guard let token else { throw FocusAPIError.message("Please sign in again.") }
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        let (data, response) = try await client.data(for: request)
        guard let response = response as? HTTPURLResponse else { throw FocusAPIError.message("Invalid server response.") }
        guard (200..<300).contains(response.statusCode) else {
            if response.statusCode == 401 { throw FocusAPIError.message("Please sign in again.") }
            let detail = try? JSONDecoder().decode(ErrorResponse.self, from: data)
            throw FocusAPIError.message(detail?.error ?? "Request failed (\(response.statusCode)).")
        }
        if T.self == EmptyResponse.self && data.isEmpty { return EmptyResponse() as! T }
        return try JSONDecoder().decode(T.self, from: data)
    }
}
