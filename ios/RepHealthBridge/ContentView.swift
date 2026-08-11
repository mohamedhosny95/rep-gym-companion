import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var bridge: HealthKitBridge
    @State private var pairingKey = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Connection") {
                    SecureField("REP_SYNC_KEY", text: $pairingKey)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    Button(bridge.isSyncing ? "Syncing…" : "Authorize & sync") {
                        Task { await bridge.authorizeAndSync(pairingKey: pairingKey) }
                    }
                    .disabled(bridge.isSyncing || pairingKey.count < 12)
                }
                Section("Status") {
                    LabeledContent("Last sync", value: bridge.lastSyncText)
                    Text(bridge.status)
                        .foregroundStyle(bridge.hasError ? .red : .secondary)
                }
                Section("Privacy") {
                    Text("Health OS receives one daily summary. Raw HealthKit samples stay in Apple Health and on this iPhone.")
                    Text("This is wellness guidance, not a medical device or diagnosis.")
                }
            }
            .navigationTitle("Rep Health Bridge")
            .task { pairingKey = KeychainStore.load() ?? "" }
        }
    }
}

