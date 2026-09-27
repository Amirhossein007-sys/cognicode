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
                Image(systemName: "curlybraces.square.fill").foregroundStyle(.cyan)
            }
        }
        .frame(width: size, height: size)
        .accessibilityLabel("کوگنی کد")
    }
}

private struct AnalysisIndicator: View {
    let state: CogniCodeActivityAttributes.ContentState
    var body: some View {
        // ActivityKit controls animation cadence. Do not use timers or pretend
        // to play audio to obtain the system's Now Playing animation.
        Image(systemName: state.isAnalyzing ? "waveform" : (state.failed ? "exclamationmark.circle.fill" : "checkmark.circle.fill"))
            .font(.system(size: 18, weight: .semibold))
            .foregroundStyle(state.isAnalyzing ? Color.cyan : (state.failed ? Color.orange : Color.green))
            .accessibilityLabel(state.isAnalyzing ? "در حال بررسی کد" : (state.failed ? "نیاز به توجه" : "بررسی تمام شد"))
    }
}

struct CogniCodeLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CogniCodeActivityAttributes.self) { context in
            HStack(spacing: 12) {
                ActivityLogo(size: 40)
                VStack(alignment: .leading, spacing: 4) {
                    Text("کوگنی کد").font(.headline)
                    Text(context.isStale ? "برای مشاهدهٔ نتیجه برنامه را باز کنید" : context.state.status)
                        .font(.subheadline)
                        .lineLimit(2)
                }
                Spacer(minLength: 8)
                AnalysisIndicator(state: context.state)
            }
            .foregroundStyle(.white)
            .padding(16)
            .activityBackgroundTint(Color(red: 15/255, green: 23/255, blue: 42/255))
            .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) { ActivityLogo(size: 32) }
                DynamicIslandExpandedRegion(.trailing) { AnalysisIndicator(state: context.state) }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 5) {
                        Text("کوگنی کد").font(.headline)
                        Text(context.isStale ? "برای مشاهدهٔ نتیجه برنامه را باز کنید" : context.state.status)
                            .font(.subheadline)
                            .lineLimit(2)
                    }
                    .foregroundStyle(.white)
                    .padding(.bottom, 6)
                }
            } compactLeading: {
                ActivityLogo()
            } compactTrailing: {
                AnalysisIndicator(state: context.state).frame(width: 24)
            } minimal: {
                ActivityLogo(size: 20)
            }
            .keylineTint(.cyan)
        }
    }
}
