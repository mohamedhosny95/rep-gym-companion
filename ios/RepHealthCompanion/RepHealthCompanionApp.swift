import SwiftUI

@main
struct RepHealthCompanionApp: App {
    @StateObject private var sync = HealthKitSyncCoordinator.shared
    @State private var pairingMessage: String?

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                Form {
                    Section("Connection") {
                        TextField("Rep origin, including https://", text: Binding(
                            get: { UserDefaults.standard.string(forKey: "repOrigin") ?? "" },
                            set: { UserDefaults.standard.set($0, forKey: "repOrigin") }
                        )).textInputAutocapitalization(.never).keyboardType(.URL)
                        
                        SecureField("Vitals import key", text: Binding(
                            get: { KeychainStore.read("repVitalsImportKey") ?? "" },
                            set: { try? KeychainStore.write($0, account: "repVitalsImportKey") }
                        ))

                        if let pairingMessage {
                            Text(pairingMessage)
                                .font(.footnote)
                                .foregroundColor(.green)
                        }
                    }
                    Section("Apple Health") {
                        LabeledContent("Status", value: sync.status)
                        if let date = sync.lastSync { LabeledContent("Last sync", value: date.formatted()) }
                        Button("Authorize Apple Health") { Task { try? await sync.requestAuthorization() } }
                        Button("Sync last 7 days") { Task { try? await sync.syncRecentDays() } }
                    }
                    Section {
                        Text("Rep uploads daily aggregates, sample counts, and coverage indicators. Raw heart-rate samples remain in Apple Health on this iPhone.")
                    }
                }
                .navigationTitle("Rep Health")
                .task { try? await sync.bootstrap() }
                .onOpenURL { url in
                    handlePairingUrl(url)
                }
            }
        }
    }

    private func handlePairingUrl(_ url: URL) {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true) else { return }
        if url.scheme == "rep-pair" || url.scheme == "healthos" {
            if let host = components.host {
                let scheme = components.scheme == "https" ? "https" : "https"
                let origin = "\(scheme)://\(host)"
                UserDefaults.standard.set(origin, forKey: "repOrigin")
            }
            if let keyItem = components.queryItems?.first(where: { $0.name == "key" || $0.name == "pairingKey" })?.value {
                try? KeychainStore.write(keyItem, account: "repVitalsImportKey")
                pairingMessage = "Connected via pairing QR code!"
                Task {
                    try? await sync.syncRecentDays()
                }
            }
        }
    }
}
