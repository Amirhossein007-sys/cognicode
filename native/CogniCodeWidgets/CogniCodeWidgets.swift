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
        guard let source = UIImage(named: "ActivityLogo") else { return nil }
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

private struct ActivityLogo: View {
    var size: CGFloat = 24
    var body: some View {
        let artwork = size > 32 ? ActivityArtwork.lockScreen : (size > 24 ? ActivityArtwork.expanded : (size >= 24 ? ActivityArtwork.compact : ActivityArtwork.minimal))
        Group {
            if let artwork {
                Image(uiImage: artwork).renderingMode(.original).resizable().scaledToFit()
            } else {
                Image(systemName: "curlybraces.square.fill")
                    .foregroundStyle(Color(red: 101.0/255.0, green: 200.0/255.0, blue: 237.0/255.0))
            }
        }
        .frame(width: size, height: size)
        .accessibilityLabel("کوگنی کد")
    }
}

/// The island presents the app logo and nothing else. Analysis progress,
/// errors and results live inside the app; the island only signals that
/// CogniCode is working, which is what the owner asked for.
struct CogniCodeLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CogniCodeActivityAttributes.self) { _ in
            HStack {
                Spacer(minLength: 0)
                ActivityLogo(size: 40)
                Spacer(minLength: 0)
            }
            .padding(16)
            .activityBackgroundTint(Color(red: 13.0/255.0, green: 27.0/255.0, blue: 45.0/255.0))
            .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { _ in
            DynamicIsland {
                DynamicIslandExpandedRegion(.center) {
                    ActivityLogo(size: 32)
                }
            } compactLeading: {
                ActivityLogo()
            } compactTrailing: {
                ActivityLogo(size: 20)
            } minimal: {
                ActivityLogo(size: 20)
            }
            .keylineTint(Color(red: 101.0/255.0, green: 200.0/255.0, blue: 237.0/255.0))
        }
    }
}
