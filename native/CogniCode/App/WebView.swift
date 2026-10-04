import SwiftUI
import WebKit
import PhotosUI
import UniformTypeIdentifiers
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
              let endFrame = userInfo[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect else { return }

        guard let webView = webView, let window = webView.window else { return }
        let windowFrame = window.convert(endFrame, from: window.screen.coordinateSpace)
        let localFrame = webView.convert(windowFrame, from: window)
        let overlap = webView.bounds.intersection(localFrame)
        let rawHeight = overlap.isNull ? 0 : overlap.height

        notifyWeb(height: rawHeight)
    }

    @objc private func keyboardWillHide(_ notification: Notification) {
        notifyWeb(height: 0)
    }

    private func notifyWeb(height: CGFloat) {
        // فقط ارتفاع توسط وب مصرف می‌شود؛ duration/curve پیش‌تر فرستاده می‌شد ولی
        // سمت JS خوانده نمی‌شد و کد مرده بود
        let js = "window.__onNativeKeyboardChange && window.__onNativeKeyboardChange(\(height));"
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
        coordinator.cancelRequests()
        uiView.stopLoading()
        uiView.navigationDelegate = nil
        // WKUserContentController retains its handlers; break the cycle.
        for name in Coordinator.messageHandlerNames {
            uiView.configuration.userContentController.removeScriptMessageHandler(forName: name)
        }
    }

    @MainActor
    final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate, PHPickerViewControllerDelegate, UIDocumentPickerDelegate {
        let webView: WKWebView
        let keyboardManager = NativeKeyboardManager()
        private var requests: [String: URLSessionDataTask] = [:]
        private var recoveryAttempts = 0
        /// نوع ورودی فایل (`accept`) که جاوااسکریپت قبل از کلیک اعلام می‌کند؛
        /// چون WKOpenPanelParameters خودش این اطلاعات را به delegate نمی‌دهد.
        private var pendingFileAccept = ""
        /// تکمیل‌کنندهٔ runOpenPanelWith؛ هر لحظه حداکثر یک پیکر باز است، پس یک خانه کافی است.
        private var pendingOpenPanelCompletion: (([URL]?) -> Void)?
        func cancelRequests() {
            for task in requests.values { task.cancel() }
            requests.removeAll()
        }
        private func notify(_ name: String, arguments: [Any]) {
            guard let data = try? JSONSerialization.data(withJSONObject: arguments),
                  let literal = String(data: data, encoding: .utf8) else { return }
            webView.evaluateJavaScript("window.\(name) && window.\(name).apply(null, \(literal));", completionHandler: nil)
        }
        static let messageHandlerNames = [
            "aiBridge", "themeBridge", "hapticBridge", "dynamicIslandBridge", "keyboardBridge", "saveImage", "aiCancelBridge", "credentialBridge", "draftBridge", "clipboardBridge", "fileBridge"
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
            wv.uiDelegate = self
            for name in Self.messageHandlerNames {
                wv.configuration.userContentController.add(self, name: name)
            }

            // راه‌اندازی رصدگر نیتیو فریم و انیمیشن کیبورد
            keyboardManager.startObserving(webView: wv)

            if let index = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web") {
                wv.loadFileURL(index, allowingReadAccessTo: index.deletingLastPathComponent())
            }
        }

        /// IP-literal و نام‌های محلی مسدود می‌شوند تا پل نیتیو نتواند به سرویس‌های
        /// داخلیِ دستگاه/شبکه درخواست بزند (endpoint فقط باید یک سرویس https عمومی باشد).
        func isBlockedHost(_ host: String) -> Bool {
            var v4 = in_addr()
            var v6 = in6_addr()
            if host.withCString({ inet_pton(AF_INET, $0, &v4) == 1 || inet_pton(AF_INET6, $0, &v6) == 1 }) {
                return true
            }
            let lower = host.lowercased()
            return lower == "localhost" || lower.hasSuffix(".localhost")
                || lower.hasSuffix(".local") || lower.hasSuffix(".internal")
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

        /// WKWebView یک ناوبریِ دانلود (`<a download>` روی data: URL) را بدون
        /// WKDownloadDelegate رها می‌کند و هیچ فایلی ساخته نمی‌شود. پس تصویر از پل
        /// می‌آید، به‌صورت فایل PNG موقت نوشته می‌شود و برگهٔ اشتراک iOS باز می‌شود
        /// تا «ذخیره تصویر» / «ذخیره در فایل‌ها» کار کند.
        private func presentShareSheet(pngData: Data, name: String) {
            // webView غیر-Optional است؛ binding شرطی روی آن کامپایل نمی‌شود.
            let webView = self.webView
            let safeName = name.replacingOccurrences(of: "/", with: "-")
            let url = FileManager.default.temporaryDirectory.appendingPathComponent(safeName)
            do { try pngData.write(to: url, options: .atomic) } catch { return }
            guard let root = webView.window?.rootViewController else { return }
            var top = root
            while let presented = top.presentedViewController { top = presented }
            let controller = UIActivityViewController(activityItems: [url], applicationActivities: nil)
            controller.popoverPresentationController?.sourceView = webView
            controller.popoverPresentationController?.sourceRect = webView.bounds
            top.present(controller, animated: true)
        }

        func userContentController(_ userContentController: WKUserContentController,
                                   didReceive message: WKScriptMessage) {
            guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.isFileURL == true else { return }
            if message.name == "aiCancelBridge", let object = message.body as? [String: Any], let id = object["id"] as? String {
                requests.removeValue(forKey: id)?.cancel()
                return
            }
            if message.name == "credentialBridge", let object = message.body as? [String: Any] {
                if object["action"] as? String == "save", let key = object["key"] as? String {
                    let saved = NativeCredential.save(key) && (key.isEmpty || NativeCredential.read() == key)
                    notify("__onNativeCredentialStatus", arguments: [saved, !(NativeCredential.read() ?? "").isEmpty])
                } else {
                    notify("__onNativeCredentialStatus", arguments: [true, !(NativeCredential.read() ?? "").isEmpty])
                }
                return
            }
            if message.name == "clipboardBridge" {
                // خواندن قطعی کلیپ‌بورد: navigator.clipboard.readText در WKWebView
                // بدون دسترسی مناسب reject می‌شود؛ UIPasteboard همیشه در دسترس است.
                DispatchQueue.main.async {
                    let text = UIPasteboard.general.string ?? ""
                    self.notify("__onNativeClipboardText", arguments: [text])
                }
                return
            }

            if message.name == "fileBridge", let object = message.body as? [String: Any] {
                pendingFileAccept = (object["accept"] as? String) ?? ""
                return
            }

            if message.name == "draftBridge", let draft = message.body as? [String: Any] {
                notify("__onNativeDraftSaved", arguments: [NativeDraft.save(draft)])
                return
            }
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
                    if action == "start" {
                        let title = (dict["title"] as? String) ?? "تحلیل کد هوش مصنوعی"
                        let status = DynamicIslandManager.shared.startAnalysis(title: title)
                        // وضعیت به‌صورت لیترال رشتهٔ JSON تزریق می‌شود تا کاراکترهای
                        // خاص هرگز ساختار JS را نشکنند
                        if let d = try? JSONSerialization.data(withJSONObject: [status]),
                           let j = String(data: d, encoding: .utf8), j.hasPrefix("["), j.hasSuffix("]") {
                            let literal = String(j.dropFirst().dropLast())
                            self.webView.evaluateJavaScript(
                                "window.__onNativeActivityStatus && window.__onNativeActivityStatus(\(literal));",
                                completionHandler: nil
                            )
                        }
                    } else if action == "stop" {
                        let state = (dict["state"] as? String) ?? "done"
                        DynamicIslandManager.shared.endAnalysis(success: state != "error")
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

            if message.name == "saveImage" {
                if let obj = message.body as? [String: Any],
                   let base64 = obj["data"] as? String,
                   let data = Data(base64Encoded: base64) {
                    let name = (obj["name"] as? String) ?? "cognicode-card.png"
                    DispatchQueue.main.async { self.presentShareSheet(pngData: data, name: name) }
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
                  !isBlockedHost(host),
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
            // Native requests obtain credentials here, never export the saved key to JS.
            let providedKey = (obj["key"] as? String) ?? ""
            let key = providedKey == "__native_keychain__" ? (NativeCredential.read() ?? "") : providedKey

            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.httpBody = body.data(using: .utf8)
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            if !key.isEmpty {
                request.setValue("Bearer " + key, forHTTPHeaderField: "Authorization")
            }
            request.timeoutInterval = 90
            let task = URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
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
                    guard let self, self.requests.removeValue(forKey: id) != nil else { return }
                    // Only the web operation's stop message ends the full multi-step activity.
                    self.webView.evaluateJavaScript("window.__nativeAI.apply(null, \(jsArgs));", completionHandler: nil)
                }
            }
            requests[id] = task
            task.resume()
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            if let draft = NativeDraft.read() { notify("__onNativeDraft", arguments: [draft]) }
            notify("__onNativeRecovery", arguments: [recoveryAttempts > 0])
            recoveryAttempts = 0
        }

        // MARK: - پنل انتخاب فایل/تصویر (بدون این، <input type=file> روی دستگاه
        // هیچ پاسخی نمی‌دهد و دکمه‌های «انتخاب فایل» و «اسکن تصویر» مرده‌اند)
        func webView(_ webView: WKWebView,
                     runOpenPanelWith parameters: WKOpenPanelParameters,
                     initiatedByFrame frameInfo: WKFrameInfo,
                     completionHandler: @escaping ([URL]?) -> Void) {
            // pendingFileAccept عمداً ریست نمی‌شود: پیام fileBridge و درخواست پنل
            // هر دو از همان صف IPC می‌آیند و آخرین accept اعلام‌شده همیشه معتبر است.
            let wantsImage = pendingFileAccept.lowercased().contains("image")
            DispatchQueue.main.async {
                if wantsImage {
                    self.presentImagePicker(allowsMultiple: parameters.allowsMultipleSelection, completionHandler: completionHandler)
                } else {
                    self.presentDocumentPicker(allowsMultiple: parameters.allowsMultipleSelection, completionHandler: completionHandler)
                }
            }
        }

        private func presentImagePicker(allowsMultiple: Bool, completionHandler: @escaping ([URL]?) -> Void) {
            var configuration = PHPickerConfiguration()
            configuration.filter = .images
            configuration.selectionLimit = allowsMultiple ? 0 : 1
            let picker = PHPickerViewController(configuration: configuration)
            picker.delegate = self
            picker.modalPresentationStyle = .formSheet
            guard let root = webView.window?.rootViewController else { completionHandler([]); return }
            var top = root
            while let presented = top.presentedViewController { top = presented }
            self.pendingOpenPanelCompletion = completionHandler
            top.present(picker, animated: true)
        }

        private func presentDocumentPicker(allowsMultiple: Bool, completionHandler: @escaping ([URL]?) -> Void) {
            // asCopy کپی موقت می‌دهد؛ نه جنگ با Security-Scoped Bookmarks، نه نشت دسترسی
            var types = Self.documentTypes(for: pendingFileAccept)
            if types.isEmpty { types = [.data, .text, .json] }
            let picker: UIDocumentPickerViewController
            if #available(iOS 14.0, *) {
                picker = UIDocumentPickerViewController(forOpeningContentTypes: types, asCopy: true)
            } else {
                picker = UIDocumentPickerViewController(documentTypes: types.compactMap(\.identifier), in: .import)
            }
            picker.allowsMultipleSelection = allowsMultiple
            picker.delegate = self
            picker.modalPresentationStyle = .formSheet
            guard let root = webView.window?.rootViewController else { completionHandler([]); return }
            var top = root
            while let presented = top.presentedViewController { top = presented }
            self.pendingOpenPanelCompletion = completionHandler
            top.present(picker, animated: true)
        }

        /// نگاشت رشتهٔ `accept` جاوااسکریپت (`.js,text/*,…`) به UTTypeهای قابل‌ارائه.
        private static func documentTypes(for accept: String) -> [UTType] {
            var seen = Set<String>()
            var types: [UTType] = []
            for rawToken in accept.split(whereSeparator: { $0 == "," || $0 == " " }) {
                let token = rawToken.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
                let mapped: UTType?
                if token.hasPrefix(".") {
                    mapped = UTType(filenameExtension: String(token.dropFirst()))
                } else if token == "text/*" || token.hasPrefix("text/") {
                    mapped = .text
                } else if token.contains("json") {
                    mapped = .json
                } else if token.contains("javascript") {
                    mapped = UTType(filenameExtension: "js")
                } else {
                    mapped = UTType(mimeType: token)
                }
                guard let mapped, !seen.contains(mapped.identifier) else { continue }
                seen.insert(mapped.identifier)
                types.append(mapped)
            }
            return types
        }

        // MARK: - PHPickerViewControllerDelegate (تصویر از گالری، بدون نیاز به مجوز عکس‌ها)
        func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
            picker.dismiss(animated: true)
            guard let completion = pendingOpenPanelCompletion else { return }
            pendingOpenPanelCompletion = nil
            pickedImageURLs(from: results.map(\.itemProvider)) { urls in
                completion(urls?.isEmpty == false ? urls : [])
            }
        }

        // MARK: - UIDocumentPickerDelegate (فایل کد متنی از دستگاه)
        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
            guard let completion = pendingOpenPanelCompletion else { return }
            pendingOpenPanelCompletion = nil
            completion(urls)
        }

        func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
            guard let completion = pendingOpenPanelCompletion else { return }
            pendingOpenPanelCompletion = nil
            completion([])
        }

        private func pickedImageURLs(from providers: [NSItemProvider], completion: @escaping ([URL]?) -> Void) {
            guard !providers.isEmpty else { completion([]); return }
            let group = DispatchGroup()
            let lock = NSLock()
            var urls: [URL] = []
            for provider in providers {
                group.enter()
                // پسوند واقعی از نوع محتوای ارائه‌شده؛ در نبودش تصویر را jpg فرض می‌کنیم
                let identifiers = provider.registeredTypeIdentifiers
                let preferred = identifiers.first { UTType($0)?.conforms(to: .image) == true } ?? identifiers.first ?? UTType.image.identifier
                let fallbackExtension = UTType(preferred)?.preferredFilenameExtension ?? "jpg"
                provider.loadDataRepresentation(forTypeIdentifier: preferred) { data, _ in
                    defer { group.leave() }
                    guard let data, !data.isEmpty else { return }
                    let url = FileManager.default.temporaryDirectory
                        .appendingPathComponent("cognicode-pick-\(UUID().uuidString).\(fallbackExtension)")
                    do { try data.write(to: url, options: .atomic) } catch { return }
                    lock.lock(); urls.append(url); lock.unlock()
                }
            }
            group.notify(queue: .main) { completion(urls) }
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            DynamicIslandManager.shared.endAnalysis(success: false)
            cancelRequests()
            recoveryAttempts += 1
            if recoveryAttempts <= 2 {
                webView.reload()
            } else if let root = webView.window?.rootViewController {
                let alert = UIAlertController(title: "بازیابی کوگنی کد", message: "نمایش صفحه متوقف شد. پیش‌نویس ذخیره‌شده با بازکردن دوباره بازیابی می‌شود.", preferredStyle: .alert)
                alert.addAction(UIAlertAction(title: "تلاش دوباره", style: .default) { [weak self] _ in
                    self?.recoveryAttempts = 0
                    self?.webView.reload()
                })
                root.present(alert, animated: true)
            }
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

