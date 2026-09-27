import ActivityKit
import UIKit
import OSLog

/// Owns the system activity for the current code-analysis session (iOS 18+).
@MainActor
final class DynamicIslandManager {
    static let shared = DynamicIslandManager()
    private var currentActivity: Activity<CogniCodeActivityAttributes>?
    private var timeoutTask: Task<Void, Never>?
    private var lastStatus = "idle"
    private var lastError = ""
    private let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "CogniCode", category: "LiveActivity")

    private init() {
        // Capture only activities from the previous process before creating a new one.
        let abandoned = Activity<CogniCodeActivityAttributes>.activities
        Task {
            for activity in abandoned {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
        }
    }

    @discardableResult
    func startAnalysis(title: String) -> String {
        endAnalysis(success: false)
        lastError = ""
        guard let plugins = Bundle.main.builtInPlugInsURL,
              FileManager.default.fileExists(atPath: plugins.appendingPathComponent("CogniCodeWidgets.appex").path) else {
            logger.error("CogniCodeWidgets.appex is missing; preserve PlugIns when signing the IPA")
            lastStatus = "missing-extension"
            return lastStatus
        }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            logger.notice("Live Activities disabled by system or user")
            lastStatus = "disabled"
            return lastStatus
        }
        guard UIApplication.shared.applicationState == .active else {
            lastStatus = "not-foreground"
            return lastStatus
        }
        do {
            let activity = try Activity<CogniCodeActivityAttributes>.request(
                attributes: CogniCodeActivityAttributes(appName: "CogniCode"),
                content: ActivityContent(
                    state: .init(status: title, isAnalyzing: true),
                    staleDate: Date().addingTimeInterval(120)
                ),
                pushType: nil
            )
            currentActivity = activity
            logger.info("Analysis Live Activity requested: \(activity.id, privacy: .public)")
            // The web AI request times out at 90 seconds. Bound orphaned activities
            // if the web process fails to send stop; this is not background execution.
            timeoutTask = Task { [weak self] in
                do { try await Task.sleep(for: .seconds(120)) } catch { return }
                guard let self, self.currentActivity?.id == activity.id else { return }
                self.endAnalysis(success: false)
            }
            lastStatus = "started"
            return lastStatus
        } catch {
            logger.error("Live Activity request failed: \(String(describing: error), privacy: .public)")
            let failure = error as NSError
            lastError = "\(failure.domain) (\(failure.code)): \(failure.localizedDescription)"
            lastStatus = "unavailable"
            return lastStatus
        }
    }

    func diagnostics() -> [String: Any] {
        let extensionURL = Bundle.main.builtInPlugInsURL?.appendingPathComponent("CogniCodeWidgets.appex")
        return [
            "status": lastStatus,
            "error": lastError,
            "enabled": ActivityAuthorizationInfo().areActivitiesEnabled,
            "extensionPresent": extensionURL.map { FileManager.default.fileExists(atPath: $0.path) } ?? false,
            "activeCount": Activity<CogniCodeActivityAttributes>.activities.filter { $0.activityState == .active }.count
        ]
    }

    func endAnalysis(success: Bool = true) {
        timeoutTask?.cancel()
        timeoutTask = nil
        guard let activity = currentActivity else { return }
        currentActivity = nil
        lastStatus = "ended"
        let state = CogniCodeActivityAttributes.ContentState(
            status: success ? "بررسی کد تمام شد" : "بررسی متوقف شد یا نیاز به توجه دارد",
            isAnalyzing: false,
            failed: !success
        )
        // Capture this activity so a delayed end cannot close the next analysis.
        Task {
            await activity.end(ActivityContent(state: state, staleDate: nil), dismissalPolicy: .immediate)
        }
    }
}
