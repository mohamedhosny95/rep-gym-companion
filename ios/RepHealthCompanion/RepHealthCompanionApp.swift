import SwiftUI

@main
struct RepHealthCompanionApp: App {
    @StateObject private var sync = HealthKitSyncCoordinator.shared
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
                        Button("Test connection") { Task { await sync.testConnection() } }
                        if let result = sync.connectionTestResult {
                            LabeledContent("Test result", value: result)
                        }
                    }
                    Section("Apple Health") {
                        LabeledContent("Status", value: sync.status)
                        if let date = sync.lastSync { LabeledContent("Last sync", value: date.formatted()) }
                        if let error = sync.lastError { Text(error).foregroundStyle(.red) }
                        Button("Authorize Apple Health") { Task { try? await sync.requestAuthorization() } }
                        Button("Sync last 7 days") { Task { try? await sync.syncRecentDays() } }
                    }
                    Section {
                        Text("Rep uploads daily aggregates, sample counts, and coverage indicators. Raw heart-rate samples remain in Apple Health on this iPhone.")
                    }
                }
                .navigationTitle("Rep Health")
                .task { try? await sync.bootstrap() }
            }
        }
    }
}
