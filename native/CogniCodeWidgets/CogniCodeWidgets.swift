import WidgetKit
import SwiftUI
import ActivityKit
import UIKit

// Archive only small, presentation-sized images in the remote widget view.
// Decode/rasterize once per process, never on each body evaluation.
private enum ActivityArtwork {
    static let minimal = thumbnail(size: 20)
    static let compact = thumbnail(size: 24)
    static let expanded = thumbnail(size: 32)
    static let lockScreen = thumbnail(size: 40)

    private static func thumbnail(size: CGFloat) -> UIImage? {
        guard let source = UIImage(named: "AnalysisBrain") else { return nil }
        let format = UIGraphicsImageRendererFormat()
        format.scale = 3
        return UIGraphicsImageRenderer(size: CGSize(width: size, height: size), format: format).image { _ in
            source.draw(in: CGRect(x: 0, y: 0, width: size, height: size))
        }
    }
}

@main
struct CogniCodeWidgetsBundle: WidgetBundle {
    var body: some Widget { CogniCodeLiveActivity() }
}

private struct ActivityBrain: View {
    var size: CGFloat = 24
    var body: some View {
        let artwork = size > 32 ? ActivityArtwork.lockScreen : (size > 24 ? ActivityArtwork.expanded : (size >= 24 ? ActivityArtwork.compact : ActivityArtwork.minimal))
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
