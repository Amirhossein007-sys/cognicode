import UIKit
import WebKit

// MARK: - موتور هوشمند تشخیص سخت‌افزار آیفون و استانداردسازی اپل (iOS 18+)
final class DeviceIntelligence {
    static let shared = DeviceIntelligence()

    struct DeviceSpec {
        let identifier: String
        let modelName: String
        let screenClass: String      // "compact", "standard", "standard-pro", "large", "large-max"
        let isPro: Bool
        let isMax: Bool
        let hasDynamicIsland: Bool
        let hasNotch: Bool
        let isProMotion: Bool
    }

    let currentDevice: DeviceSpec

    init() {
        self.currentDevice = DeviceIntelligence.detectDevice()
    }

    private static func detectDevice() -> DeviceSpec {
        var systemInfo = utsname()
        uname(&systemInfo)
        let machineMirror = Mirror(reflecting: systemInfo.machine)
        var id = machineMirror.children.reduce("") { identifier, element in
            guard let value = element.value as? Int8, value != 0 else { return identifier }
            return identifier + String(UnicodeScalar(UInt8(value)))
        }

        #if targetEnvironment(simulator)
        if let simId = ProcessInfo().environment["SIMULATOR_MODEL_IDENTIFIER"] {
            id = simId
        }
        #endif

        let screen = UIScreen.main
        // ابعاد منطقی واقعی سخت‌افزار: nativeScale از مقیاس‌شدگی حالت legacy
        // مصون است؛ bounds در پنجره 320×480 compatibility ابعاد کوچک را برمی‌گرداند
        let native = screen.nativeBounds
        let scale = max(1, screen.nativeScale)
        let pointW = native.width / scale
        let pointH = native.height / scale
        let maxDim = max(pointW, pointH)
        let minDim = min(pointW, pointH)

        var modelName = "iPhone"
        var screenClass = "standard"
        var isPro = false
        var isMax = false
        var hasDynamicIsland = false
        var hasNotch = false
        var isProMotion = false

        switch id {
        case "iPhone14,4":
            modelName = "iPhone 13 mini"
            screenClass = "compact"
            hasNotch = true
        case "iPhone14,5":
            modelName = "iPhone 13"
            screenClass = "standard"
            hasNotch = true
        case "iPhone14,2":
            modelName = "iPhone 13 Pro"
            screenClass = "standard"
            isPro = true
            hasNotch = true
            isProMotion = true
        case "iPhone14,3":
            modelName = "iPhone 13 Pro Max"
            screenClass = "large"
            isPro = true
            isMax = true
            hasNotch = true
            isProMotion = true
        case "iPhone14,7":
            modelName = "iPhone 14"
            screenClass = "standard"
            hasNotch = true
        case "iPhone14,8":
            modelName = "iPhone 14 Plus"
            screenClass = "large"
            isMax = true
            hasNotch = true
        case "iPhone15,2":
            modelName = "iPhone 14 Pro"
            screenClass = "standard"
            isPro = true
            hasDynamicIsland = true
            isProMotion = true
        case "iPhone15,3":
            modelName = "iPhone 14 Pro Max"
            screenClass = "large"
            isPro = true
            isMax = true
            hasDynamicIsland = true
            isProMotion = true
        case "iPhone15,4":
            modelName = "iPhone 15"
            screenClass = "standard"
            hasDynamicIsland = true
        case "iPhone15,5":
            modelName = "iPhone 15 Plus"
            screenClass = "large"
            isMax = true
            hasDynamicIsland = true
        case "iPhone16,1":
            modelName = "iPhone 15 Pro"
            screenClass = "standard"
            isPro = true
            hasDynamicIsland = true
            isProMotion = true
        case "iPhone16,2":
            modelName = "iPhone 15 Pro Max"
            screenClass = "large"
            isPro = true
            isMax = true
            hasDynamicIsland = true
            isProMotion = true
        case "iPhone17,3":
            modelName = "iPhone 16"
            screenClass = "standard"
            hasDynamicIsland = true
        case "iPhone17,4":
            modelName = "iPhone 16 Plus"
            screenClass = "large"
            isMax = true
            hasDynamicIsland = true
        case "iPhone17,1":
            modelName = "iPhone 16 Pro"
            screenClass = "standard-pro"
            isPro = true
            hasDynamicIsland = true
            isProMotion = true
        case "iPhone17,2":
            modelName = "iPhone 16 Pro Max"
            screenClass = "large-max"
            isPro = true
            isMax = true
            hasDynamicIsland = true
            isProMotion = true
        default:
            // برای مدل‌های ناشناخته، نام بازاری یا قابلیت‌های اختصاصی را بر مبنای ابعاد حدس نزن
            if minDim >= 435 || maxDim >= 950 {
                modelName = "iPhone"
                screenClass = "large-max"
                isMax = true
            } else if minDim >= 420 || maxDim >= 920 {
                modelName = "iPhone"
                screenClass = "large"
                isMax = true
            } else if minDim >= 398 || (maxDim >= 865 && maxDim < 900) {
                modelName = "iPhone"
                screenClass = "standard-pro"
            } else if minDim <= 380 {
                modelName = "iPhone"
                screenClass = "compact"
            } else {
                modelName = "iPhone"
                screenClass = "standard"
            }
        }

        // بررسی اندازه‌گیری‌شدهٔ نرخ نوسازی (ProMotion واقعی)
        isProMotion = screen.maximumFramesPerSecond >= 120

        return DeviceSpec(
            identifier: id,
            modelName: modelName,
            screenClass: screenClass,
            isPro: isPro,
            isMax: isMax,
            hasDynamicIsland: hasDynamicIsland,
            hasNotch: hasNotch,
            isProMotion: isProMotion
        )
    }

    func generateUserScript() -> WKUserScript {
        let spec = currentDevice
        // JSON encoding keeps quotes/backslashes in model names valid JavaScript.
        let payload: [String: Any] = [
            "modelName": spec.modelName,
            "hardwareId": spec.identifier,
            "screenClass": spec.screenClass,
            "isPro": spec.isPro,
            "isMax": spec.isMax,
            "hasDynamicIsland": spec.hasDynamicIsland,
            "hasNotch": spec.hasNotch,
            "isProMotion": spec.isProMotion,
            "iOSVersion": UIDevice.current.systemVersion
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8) else {
            return WKUserScript(source: "", injectionTime: .atDocumentStart, forMainFrameOnly: true)
        }

        let js = """
        (function() {
            var device = \(json);
            window.__cogniDevice = device;
            function applyRootClasses() {
                var doc = document.documentElement;
                if (!doc) return;
                var modelSlug = device.modelName.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
                doc.classList.add("ios-" + device.iOSVersion.split('.')[0]);
                doc.classList.add("device-" + modelSlug);
                doc.classList.add("screen-" + device.screenClass);
                // device-pro هیچ مصرفی در CSS/JS/تست‌ها نداشت و حذف شد؛ اما
                // device-max در styles.css مصرف دارد و --device-model/
                // --device-screen-class قرارداد تأییدشدهٔ check-device-script هستند
                if (device.isMax) doc.classList.add("device-max");
                if (device.hasDynamicIsland) doc.classList.add("has-dynamic-island");
                if (device.hasNotch) doc.classList.add("has-notch");
                if (device.isProMotion) doc.classList.add("is-promotion");
                doc.style.setProperty("--device-model", device.modelName);
                doc.style.setProperty("--device-screen-class", device.screenClass);
            }
            if (document.documentElement) {
                applyRootClasses();
            } else {
                document.addEventListener("DOMContentLoaded", applyRootClasses, { once: true });
            }
        })();
        """

        return WKUserScript(source: js, injectionTime: .atDocumentStart, forMainFrameOnly: true)
    }
}