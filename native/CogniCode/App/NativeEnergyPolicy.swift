import UIKit
import WebKit

/// Event-driven policy: no battery polling or recurring native timers.
@MainActor
final class NativeEnergyPolicy {
    private weak var webView: WKWebView?
    private var observers: [NSObjectProtocol] = []
    private var onInactive: (() -> Void)?

    static func initialScript() -> WKUserScript {
        let lowPower = ProcessInfo.processInfo.isLowPowerModeEnabled
        let thermal = ProcessInfo.processInfo.thermalState.rawValue
        return WKUserScript(
            source: "window.__cogniEnergy={lowPower:\(lowPower),thermal:\(thermal)};",
            injectionTime: .atDocumentStart, forMainFrameOnly: true
        )
    }

    func start(webView: WKWebView, onInactive: @escaping () -> Void) {
        stop()
        self.webView = webView
        self.onInactive = onInactive
        for name in [Notification.Name.NSProcessInfoPowerStateDidChange,
                     ProcessInfo.thermalStateDidChangeNotification,
                     UIApplication.willResignActiveNotification,
                     UIApplication.didBecomeActiveNotification,
                     UIApplication.didEnterBackgroundNotification] {
            let observer = NotificationCenter.default.addObserver(forName: name, object: nil, queue: .main) { [weak self] notification in
                let active: Bool? = notification.name == UIApplication.willResignActiveNotification || notification.name == UIApplication.didEnterBackgroundNotification ? false : nil
                Task { @MainActor [weak self] in self?.publish(active: active) }
            }
            observers.append(observer)
        }
    }

    func publish(active: Bool? = nil) {
        let lowPower = ProcessInfo.processInfo.isLowPowerModeEnabled
        let thermal = ProcessInfo.processInfo.thermalState.rawValue
        let isActive = active ?? (UIApplication.shared.applicationState == .active)
        // Cancel native network work even when WebKit is already suspended.
        if !isActive { onInactive?() }
        let script = """
        (function(){
          var energy={lowPower:\(lowPower),thermal:\(thermal)};
          window.__cogniEnergy=energy;
          if(document.documentElement){
            document.documentElement.classList.toggle('energy-saving',energy.lowPower||energy.thermal>=1);
            document.documentElement.classList.toggle('app-paused',!\(isActive));
          }
          window.dispatchEvent(new CustomEvent('cognicode:energy-change',{detail:energy}));
          window.dispatchEvent(new CustomEvent('cognicode:native-active',{detail:\(isActive)}));
        })();
        """
        webView?.evaluateJavaScript(script, completionHandler: nil)
    }

    func stop() {
        observers.forEach { NotificationCenter.default.removeObserver($0) }
        observers.removeAll()
        webView = nil
        onInactive = nil
    }

    deinit { observers.forEach { NotificationCenter.default.removeObserver($0) } }
}
