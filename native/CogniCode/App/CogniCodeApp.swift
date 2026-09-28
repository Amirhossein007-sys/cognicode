import SwiftUI

@main
struct CogniCodeApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

struct ContentView: View {
    var body: some View {
        ZStack {
            Color(red: 13.0/255.0, green: 27.0/255.0, blue: 45.0/255.0)
            WebViewContainer()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        // Web CSS owns safe-area padding. Keep the container edge-to-edge,
        // including the keyboard region, so the keyboard overlays the page.
        .ignoresSafeArea(.all)
    }
}
