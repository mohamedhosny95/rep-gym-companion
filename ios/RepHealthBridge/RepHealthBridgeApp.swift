import SwiftUI

@main
struct RepHealthBridgeApp: App {
    @StateObject private var bridge = HealthKitBridge()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(bridge)
        }
    }
}

