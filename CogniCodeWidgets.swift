import WidgetKit
import SwiftUI
import ActivityKit
import UIKit

// Archive only small, presentation-sized images in the remote widget view.
// Decode/rasterize once per process, never on each body evaluation.
@MainActor
private enum ActivityArtwork {
    private static var cache: [String: UIImage] = [:]
    static func thumbnail(size: CGFloat, scale: CGFloat) -> UIImage? {
        let key = "\(size)-\(scale)"
        if let cached = cache[key] { return cached }
        guard let source = UIImage(named: "AnalysisBrain") else { return nil }
        let format = UIGraphicsImageRendererFormat()
        format.scale = max(1, scale)
        let image = UIGraphicsImageRenderer(size: CGSize(width: size, height: size), format: format).image { _ in
            source.draw(in: CGRect(x: 0, y: 0, width: size, height: size))
        }
        cache[key] = image
        return image
    }
}

@main
struct CogniCodeWidgetsBundle: WidgetBundle {
    var body: some Widget { CogniCodeLiveActivity() }
}

private struct ActivityBrain: View {
    @Environment(\.displayScale) private var displayScale
    var size: CGFloat = 24
    var body: some View {
        let artwork = ActivityArtwork.thumbnail(size: size, scale: displayScale)
        Group {
            if let artwork {
                Image(uiImage: artwork).renderingMode(.original).resizable().scaledToFit()
            } else {
                Image(systemName: "brain.head.profile").foregroundStyle(.cyan)
            }
        }
        .frame(width: size, height: size)
        .accessibilityLabel("تحلیل کد در حال انجام است")
    }
}

/// A compact brain mark represents active analysis; progress and results
/// remain in the app. The system chooses the island presentation size.
struct CogniCodeLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CogniCodeActivityAttributes.self) { _ in
            HStack {
                Spacer(minLength: 0)
                ActivityBrain(size: 40)
                Spacer(minLength: 0)
            }
            .padding(16)
            .activityBackgroundTint(Color(red: 15/255, green: 23/255, blue: 42/255))
            .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { _ in
            DynamicIsland {
                DynamicIslandExpandedRegion(.center) {
                    ActivityBrain(size: 32)
                }
            } compactLeading: {
                ActivityBrain()
            } compactTrailing: {
                ActivityBrain(size: 20)
            } minimal: {
                ActivityBrain(size: 20)
            }
            .keylineTint(.cyan)
        }
    }
}
