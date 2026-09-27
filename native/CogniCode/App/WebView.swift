import SwiftUI
import WebKit
#if canImport(Darwin)
import Darwin
#endif
#if canImport(ActivityKit)
import ActivityKit
#endif

// MARK: - ژنراتورهای کش‌شده و آماده‌به‌کار هپتیک (Zero-Latency Taptic Engine)
final class HapticManager {
    static let shared = HapticManager()
    private let light = UIImpactFeedbackGenerator(style: .light)
    private let medium = UIImpactFeedbackGenerator(style: .medium)
    private let heavy = UIImpactFeedbackGenerator(style: .heavy)
    private let rigid = UIImpactFeedbackGenerator(style: .rigid)
    private let soft = UIImpactFeedbackGenerator(style: .soft)
    private let notify = UINotificationFeedbackGenerator()
    private let selection = UISelectionFeedbackGenerator()

    init() {
        prepareAll()
    }

    func prepareAll() {
        light.prepare()
        medium.prepare()
        heavy.prepare()
        rigid.prepare()
        soft.prepare()
        notify.prepare()
        selection.prepare()
    }

    func trigger(_ type: String) {
        switch type {
        case "light":
            light.impactOccurred()
            light.prepare()
        case "medium":
            medium.impactOccurred()
            medium.prepare()
        case "heavy":
            heavy.impactOccurred()
            heavy.prepare()
        case "rigid":
            rigid.impactOccurred()
            rigid.prepare()
        case "soft":
            soft.impactOccurred()
            soft.prepare()
        case "success":
            notify.notificationOccurred(.success)
            notify.prepare()
        case "warning":
            notify.notificationOccurred(.warning)
            notify.prepare()
        case "error":
            notify.notificationOccurred(.error)
            notify.prepare()
        case "selection":
            selection.selectionChanged()
            selection.prepare()
        default:
            medium.impactOccurred()
            medium.prepare()
        }
    }
}

// MARK: - پل ارتباطی داینامیک آیلند (Live Activities و WidgetKit سخت‌افزاری)
// MARK: - موتور نیتیو همگام‌سازی کیبورد iOS 18 (بدون لگ، پرش یا نوار سیاه)
final class NativeKeyboardManager: NSObject {
    weak var webView: WKWebView?

    func stopObserving() {
        NotificationCenter.default.removeObserver(self)
        webView = nil
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    func startObserving(webView: WKWebView) {
        self.webView = webView
        NotificationCenter.default.removeObserver(self)
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillChangeFrame(_:)),
            name: UIResponder.keyboardWillChangeFrameNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillHide(_:)),
            name: UIResponder.keyboardWillHideNotification,
            object: nil
        )
    }

    @objc private func keyboardWillChangeFrame(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let endFrame = userInfo[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect,
              let duration = userInfo[UIResponder.keyboardAnimationDurationUserInfoKey] as? Double else { return }

        guard let webView = webView, let window = webView.window else { return }
        let windowFrame = window.convert(endFrame, from: window.screen.coordinateSpace)
        let localFrame = webView.convert(windowFrame, from: window)
        let overlap = webView.bounds.intersection(localFrame)
        let rawHeight = overlap.isNull ? 0 : overlap.height
        let curve = (userInfo[UIResponder.keyboardAnimationCurveUserInfoKey] as? UInt) ?? 7

        notifyWeb(height: rawHeight, duration: duration, curve: curve)
    }

    @objc private func keyboardWillHide(_ notification: Notification) {
        let duration = (notification.userInfo?[UIResponder.keyboardAnimationDurationUserInfoKey] as? Double) ?? 0.25
        notifyWeb(height: 0, duration: duration, curve: 7)
    }

    private func notifyWeb(height: CGFloat, duration: Double, curve: UInt) {
        let js = "window.__onNativeKeyboardChange && window.__onNativeKeyboardChange(\(height), \(duration), \(curve));"
        DispatchQueue.main.async {
            self.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }
}

// MARK: - ساختار نمایش وب‌ویو نیتیو (فول‌اسکرین واقعی بدون Letterboxing)
struct WebViewContainer: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        // SwiftUI owns the representable's frame; do not size it from UIScreen
        // or from its superview, which can include safe-area/layout intermediates.
        context.coordinator.webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        // SwiftUI updates the WKWebView bounds when its container changes size.
    }

    func makeCoordinator() -> Coordinator { Coordinator() }

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        DynamicIslandManager.shared.endAnalysis(success: false)
        coordinator.keyboardManager.stopObserving()
        uiView.stopLoading()
        uiView.navigationDelegate = nil
        // WKUserContentController retains its handlers; break the cycle.
        for name in Coordinator.messageHandlerNames {
            uiView.configuration.userContentController.removeScriptMessageHandler(forName: name)
        }
    }

    final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        let webView: WKWebView
        let keyboardManager = NativeKeyboardManager()
        static let messageHandlerNames = [
            "aiBridge", "themeBridge", "hapticBridge", "dynamicIslandBridge", "keyboardBridge"
        ]

        override init() {
            let config = WKWebViewConfiguration()
            config.preferences.isElementFullscreenEnabled = true

            // تزریق متادیتای هوشمند سخت‌افزار آیفون قبل از شروع رندر DOM
            config.userContentController.addUserScript(DeviceIntelligence.shared.generateUserScript())

            // The bundled index.html owns viewport metadata. At document start,
            // document.head may not exist; do not inject a duplicate viewport.

            let wv = WKWebView(frame: .zero, configuration: config)
            // SwiftUI فریم را ست می‌کند؛ ماسک autoresizing تضمین می‌کند وب‌ویو در هر
            // تغییر چیدمان (چرخش، کیبورد، ترنزیشن لانچ) دقیقاً کل کانتینر را پر کند
            wv.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            wv.isOpaque = false
            wv.backgroundColor = UIColor(red: 15.0/255.0, green: 23.0/255.0, blue: 42.0/255.0, alpha: 1)

            wv.scrollView.contentInsetAdjustmentBehavior = .never
            wv.scrollView.bounces = false
            wv.scrollView.alwaysBounceVertical = false
            wv.scrollView.alwaysBounceHorizontal = false
            wv.scrollView.contentInset = .zero
            wv.scrollView.scrollIndicatorInsets = .zero
            wv.scrollView.clipsToBounds = true

            // بستن خودکار کیبورد با سوایپ به پایین درون اسکرول (استاندارد بومی اپل)
            wv.scrollView.keyboardDismissMode = .onDrag

            if #available(iOS 15.0, *) {
                wv.underPageBackgroundColor = UIColor(red: 15.0/255.0, green: 23.0/255.0, blue: 42.0/255.0, alpha: 1)
            }

            wv.allowsBackForwardNavigationGestures = false
            self.webView = wv

            super.init()

            // Initialize session cleanup at app launch, not at the next Play tap.
            DispatchQueue.main.async { _ = DynamicIslandManager.shared }

            wv.navigationDelegate = self
            for name in Self.messageHandlerNames {
                wv.configuration.userContentController.add(self, name: name)
            }

            // راه‌اندازی رصدگر نیتیو فریم و انیمیشن کیبورد
            keyboardManager.startObserving(webView: wv)

            if let index = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web") {
                wv.loadFileURL(index, allowingReadAccessTo: index.deletingLastPathComponent())
            }
        }

        func isIpLiteral(_ host: String) -> Bool {
            var v4 = in_addr()
            var v6 = in6_addr()
            return host.withCString { c in
                inet_pton(AF_INET, c, &v4) == 1 || inet_pton(AF_INET6, c, &v6) == 1
            }
        }

        func applySystemTheme(dark: Bool) {
            let style: UIUserInterfaceStyle = dark ? .dark : .light
            DispatchQueue.main.async {
                for case let windowScene as UIWindowScene in UIApplication.shared.connectedScenes {
                    for window in windowScene.windows {
                        window.overrideUserInterfaceStyle = style
                    }
                }
                let bgColor = dark
                    ? UIColor(red: 15.0/255.0, green: 23.0/255.0, blue: 42.0/255.0, alpha: 1)
                    : UIColor(red: 248.0/255.0, green: 250.0/255.0, blue: 252.0/255.0, alpha: 1)
                self.webView.backgroundColor = bgColor
                if #available(iOS 15.0, *) {
                    self.webView.underPageBackgroundColor = bgColor
                }
            }
        }

        func userContentController(_ userContentController: WKUserContentController,
                                   didReceive message: WKScriptMessage) {
            if message.name == "hapticBridge", let type = message.body as? String {
                DispatchQueue.main.async {
                    HapticManager.shared.trigger(type)
                }
                return
            }

            if message.name == "keyboardBridge" {
                DispatchQueue.main.async {
                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                }
                return
            }

            if message.name == "dynamicIslandBridge" {
                if let dict = message.body as? [String: Any], let action = dict["action"] as? String {
                    DispatchQueue.main.async {
                        if action == "start" {
                            let title = (dict["title"] as? String) ?? "تحلیل کد هوش مصنوعی"
                            let status = DynamicIslandManager.shared.startAnalysis(title: title)
                            self.webView.evaluateJavaScript(
                                "window.__onNativeActivityStatus && window.__onNativeActivityStatus('\(status)');",
                                completionHandler: nil
                            )
                        } else if action == "stop" {
                            let state = (dict["state"] as? String) ?? "done"
                            DynamicIslandManager.shared.endAnalysis(success: state != "error")
                        }
                    }
                }
                return
            }

            if message.name == "themeBridge" {
                if let obj = message.body as? [String: Any], let dark = obj["dark"] as? Bool {
                    applySystemTheme(dark: dark)
                }
                return
            }

            guard message.name == "aiBridge",
                  let obj = message.body as? [String: Any],
                  let id = obj["id"] as? String else { return }

            guard let urlString = obj["url"] as? String,
                  let body = obj["body"] as? String,
                  let url = URL(string: urlString),
                  let comps = URLComponents(string: urlString),
                  url.scheme == "https",
                  comps.user == nil, comps.password == nil,
                  comps.port == nil || comps.port == 443,
                  let host = comps.host, !host.isEmpty,
                  !isIpLiteral(host),
                  body.contains("\"messages\"") else {
                let payload: [Any] = [id, false, 400, "درخواست به دلیل محدودیت‌های امنیتی شبکه رد شد"]
                if let json = try? JSONSerialization.data(withJSONObject: payload),
                   let jsArgs = String(data: json, encoding: .utf8) {
                    DispatchQueue.main.async {
                        self.webView.evaluateJavaScript("window.__nativeAI.apply(null, \(jsArgs));", completionHandler: nil)
                    }
                }
                return
            }
            let key = (obj["key"] as? String) ?? ""

            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.httpBody = body.data(using: .utf8)
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            if !key.isEmpty {
                request.setValue("Bearer " + key, forHTTPHeaderField: "Authorization")
            }
            request.timeoutInterval = 90

            URLSession.shared.dataTask(with: request) { data, response, error in
                let status = (response as? HTTPURLResponse)?.statusCode ?? 0
                let text: String
                if let error = error {
                    text = error.localizedDescription
                } else {
                    text = String(data: data ?? Data(), encoding: .utf8) ?? ""
                }
                let ok = error == nil && (200..<300).contains(status)
                let payload: [Any] = [id, ok, status, text]
                guard let json = try? JSONSerialization.data(withJSONObject: payload),
                      let jsArgs = String(data: json, encoding: .utf8) else { return }
                DispatchQueue.main.async {
                    self.webView.evaluateJavaScript("window.__nativeAI.apply(null, \(jsArgs));", completionHandler: nil)
                }
            }.resume()
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            DynamicIslandManager.shared.endAnalysis(success: false)
        }

        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if navigationAction.navigationType == .linkActivated,
               let url = navigationAction.request.url,
               url.scheme == "http" || url.scheme == "https" {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }
    }
}

