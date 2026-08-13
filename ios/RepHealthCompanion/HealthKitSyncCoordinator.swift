import Foundation
import HealthKit
import Security
import UIKit

struct RepDailyVitals: Codable {
    let date: String
    let sleep_hours: Double?
    let bedtime: String?
    let wake_time: String?
    let hrv_ms: Double?
    let resting_hr_bpm: Double?
    let respiratory_rate_bpm: Double?
    let active_energy_kcal: Double?
    let steps: Double?
    let exercise_minutes: Double?
    let stand_minutes: Double?
    let vo2_max: Double?
    let oxygen_saturation_pct: Double?
    let wrist_temperature_c: Double?
    let sleep_deep_hours: Double?
    let sleep_rem_hours: Double?
    let coverage_minutes: Double?
    let heart_rate_samples: Double?
    let workout_hr_samples: Double?
    let watch_battery_pct: Double?
    let source: String
}

@MainActor
final class HealthKitSyncCoordinator: ObservableObject {
    static let shared = HealthKitSyncCoordinator()
    private let store = HKHealthStore()
    @Published private(set) var lastSync: Date?
    @Published private(set) var status = "Not connected"
    @Published private(set) var lastError: String?
    @Published private(set) var connectionTestResult: String?

    private var readTypes: Set<HKObjectType> {
        let quantities: [HKQuantityTypeIdentifier] = [
            .heartRate, .heartRateVariabilitySDNN, .restingHeartRate,
            .respiratoryRate, .activeEnergyBurned, .stepCount, .vo2Max,
            .oxygenSaturation, .appleExerciseTime, .appleStandTime,
            .appleSleepingWristTemperature
        ]
        var result = Set(quantities.compactMap(HKObjectType.quantityType(forIdentifier:)))
        if let sleep = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) { result.insert(sleep) }
        if let workout = HKObjectType.workoutType() as HKObjectType? { result.insert(workout) }
        return result
    }

    func requestAuthorization() async throws {
        guard HKHealthStore.isHealthDataAvailable() else { throw SyncError.healthUnavailable }
        try await store.requestAuthorization(toShare: [], read: readTypes)
        try await bootstrap()
    }

    func bootstrap() async throws {
        do {
            for type in readTypes {
                try await store.enableBackgroundDelivery(for: type, frequency: .hourly)
                let query = HKObserverQuery(sampleType: type, predicate: nil) { [weak self] _, completion, error in
                    defer { completion() }
                    if let error {
                        Task { await self?.recordFailure(status: "Observer error", error: error) }
                        return
                    }
                    // Errors here previously vanished into `try?` with no visible signal beyond a
                    // status string that just stopped updating. recordFailure keeps that visible.
                    Task { [weak self] in
                        do {
                            try await self?.syncRecentDays()
                        } catch {
                            await self?.recordFailure(status: "Sync failed", error: error)
                        }
                    }
                }
                store.execute(query)
            }
            try await syncRecentDays()
        } catch {
            recordFailure(status: "Setup failed", error: error)
            throw error
        }
    }

    func syncRecentDays() async throws {
        status = "Syncing"
        do {
            for offset in stride(from: -7, through: 0, by: 1) {
                let day = Calendar.current.date(byAdding: .day, value: offset, to: Date())!
                let summary = try await summarize(day)
                try await RepVitalsUploader.shared.upload(summary)
            }
            lastSync = Date()
            status = "Current"
            lastError = nil
        } catch {
            recordFailure(status: "Sync failed", error: error)
            throw error
        }
    }

    private func recordFailure(status: String, error: Error) {
        self.status = status
        self.lastError = error.localizedDescription
    }

    // Pings the server without requiring HealthKit authorization first, so a user can verify
    // the origin and vitals import key are correct before granting Health access.
    func testConnection() async {
        do {
            _ = try await RepVitalsUploader.shared.testConnection()
            connectionTestResult = "Connected"
            lastError = nil
        } catch {
            connectionTestResult = "Failed"
            lastError = error.localizedDescription
        }
    }

    private func summarize(_ day: Date) async throws -> RepDailyVitals {
        let interval = Calendar.current.dateInterval(of: .day, for: day)!
        async let hrv = average(.heartRateVariabilitySDNN, unit: .secondUnit(with: .milli), interval)
        async let rhr = average(.restingHeartRate, unit: HKUnit.count().unitDivided(by: .minute()), interval)
        async let respiratory = average(.respiratoryRate, unit: HKUnit.count().unitDivided(by: .minute()), interval)
        async let energy = sum(.activeEnergyBurned, unit: .kilocalorie(), interval)
        async let steps = sum(.stepCount, unit: .count(), interval)
        async let exercise = sum(.appleExerciseTime, unit: .minute(), interval)
        async let stand = sum(.appleStandTime, unit: .minute(), interval)
        async let vo2 = average(.vo2Max, unit: HKUnit(from: "ml/kg*min"), interval)
        async let oxygen = average(.oxygenSaturation, unit: .percent(), interval)
        async let temperature = average(.appleSleepingWristTemperature, unit: .degreeCelsius(), interval)
        async let heartCoverage = heartCoverage(interval)
        async let workoutSamples = workoutHeartRateCount(interval)
        async let sleep = sleepSummary(interval)
        let sleepResult = try await sleep
        let formatter = DateFormatter(); formatter.calendar = .current; formatter.locale = Locale(identifier: "en_US_POSIX"); formatter.dateFormat = "yyyy-MM-dd"
        let coverageResult = try await heartCoverage
        return try await RepDailyVitals(
            date: formatter.string(from: day), sleep_hours: sleepResult.total,
            bedtime: sleepResult.start, wake_time: sleepResult.end,
            hrv_ms: hrv, resting_hr_bpm: rhr, respiratory_rate_bpm: respiratory,
            active_energy_kcal: energy, steps: steps, exercise_minutes: exercise,
            stand_minutes: stand, vo2_max: vo2,
            oxygen_saturation_pct: oxygen.map { $0 * 100 },
            wrist_temperature_c: temperature, sleep_deep_hours: sleepResult.deep,
            sleep_rem_hours: sleepResult.rem, coverage_minutes: coverageResult.minutes,
            heart_rate_samples: Double(coverageResult.count), workout_hr_samples: Double(workoutSamples),
            watch_battery_pct: nil, source: "Rep HealthKit Companion"
        )
    }

    private func predicate(_ interval: DateInterval) -> NSPredicate {
        HKQuery.predicateForSamples(withStart: interval.start, end: interval.end, options: [.strictStartDate])
    }

    private func average(_ identifier: HKQuantityTypeIdentifier, unit: HKUnit, _ interval: DateInterval) async throws -> Double? {
        guard let type = HKQuantityType.quantityType(forIdentifier: identifier) else { return nil }
        return try await statistics(type, option: .discreteAverage, unit: unit, interval)
    }

    private func sum(_ identifier: HKQuantityTypeIdentifier, unit: HKUnit, _ interval: DateInterval) async throws -> Double? {
        guard let type = HKQuantityType.quantityType(forIdentifier: identifier) else { return nil }
        return try await statistics(type, option: .cumulativeSum, unit: unit, interval)
    }

    private func statistics(_ type: HKQuantityType, option: HKStatisticsOptions, unit: HKUnit, _ interval: DateInterval) async throws -> Double? {
        try await withCheckedThrowingContinuation { continuation in
            let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate(interval), options: option) { _, result, error in
                if let error { continuation.resume(throwing: error); return }
                let quantity = option == .cumulativeSum ? result?.sumQuantity() : result?.averageQuantity()
                continuation.resume(returning: quantity?.doubleValue(for: unit))
            }
            store.execute(query)
        }
    }

    private func sampleCount(_ identifier: HKQuantityTypeIdentifier, _ interval: DateInterval) async throws -> Int {
        guard let type = HKQuantityType.quantityType(forIdentifier: identifier) else { return 0 }
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(sampleType: type, predicate: predicate(interval), limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
                if let error { continuation.resume(throwing: error) } else { continuation.resume(returning: samples?.count ?? 0) }
            }
            store.execute(query)
        }
    }

    private func heartCoverage(_ interval: DateInterval) async throws -> (count: Int, minutes: Double?) {
        guard let type = HKQuantityType.quantityType(forIdentifier: .heartRate) else { return (0,nil) }
        let samples: [HKQuantitySample] = try await withCheckedThrowingContinuation { continuation in
            let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
            let query = HKSampleQuery(sampleType: type, predicate: predicate(interval), limit: HKObjectQueryNoLimit, sortDescriptors: [sort]) { _, values, error in
                if let error { continuation.resume(throwing: error) } else { continuation.resume(returning: (values as? [HKQuantitySample]) ?? []) }
            }
            store.execute(query)
        }
        guard let first = samples.first, let last = samples.last else { return (samples.count,nil) }
        return (samples.count, min(1440, last.endDate.timeIntervalSince(first.startDate) / 60))
    }

    private func workoutHeartRateCount(_ interval: DateInterval) async throws -> Int {
        let workoutPredicate = HKQuery.predicateForWorkouts(with: .greaterThanOrEqualTo, duration: 60)
        let workouts: [HKWorkout] = try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(sampleType: .workoutType(), predicate: NSCompoundPredicate(andPredicateWithSubpredicates: [predicate(interval), workoutPredicate]), limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
                if let error { continuation.resume(throwing: error) } else { continuation.resume(returning: (samples as? [HKWorkout]) ?? []) }
            }
            store.execute(query)
        }
        var count = 0
        for workout in workouts { count += try await sampleCount(.heartRate, DateInterval(start: workout.startDate, end: workout.endDate)) }
        return count
    }

    private func sleepSummary(_ interval: DateInterval) async throws -> (total: Double?, deep: Double?, rem: Double?, start: String?, end: String?) {
        guard let type = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis) else { return (nil,nil,nil,nil,nil) }
        let samples: [HKCategorySample] = try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(sampleType: type, predicate: predicate(interval), limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, values, error in
                if let error { continuation.resume(throwing: error) } else { continuation.resume(returning: (values as? [HKCategorySample]) ?? []) }
            }
            store.execute(query)
        }
        let asleep = samples.filter { [HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue, HKCategoryValueSleepAnalysis.asleepCore.rawValue, HKCategoryValueSleepAnalysis.asleepDeep.rawValue, HKCategoryValueSleepAnalysis.asleepREM.rawValue].contains($0.value) }
        let hours: (HKCategorySample) -> Double = { $0.endDate.timeIntervalSince($0.startDate) / 3600 }
        let format = DateFormatter(); format.dateFormat = "HH:mm"
        return (asleep.map(hours).reduce(0,+), asleep.filter{$0.value == HKCategoryValueSleepAnalysis.asleepDeep.rawValue}.map(hours).reduce(0,+), asleep.filter{$0.value == HKCategoryValueSleepAnalysis.asleepREM.rawValue}.map(hours).reduce(0,+), asleep.map{$0.startDate}.min().map(format.string), asleep.map{$0.endDate}.max().map(format.string))
    }
}

enum SyncError: Error, LocalizedError {
    case healthUnavailable, configurationMissing, serverRejected, unauthorized

    var errorDescription: String? {
        switch self {
        case .healthUnavailable: return "Health data is not available on this device."
        case .configurationMissing: return "Set the Rep origin and vitals import key above first."
        case .serverRejected: return "Rep rejected the request."
        case .unauthorized: return "The vitals import key was rejected. Check it matches the server's VITALS_IMPORT_KEY."
        }
    }
}

final class RepVitalsUploader {
    static let shared = RepVitalsUploader()
    func upload(_ vitals: RepDailyVitals) async throws {
        guard let origin = UserDefaults.standard.string(forKey: "repOrigin"),
              let key = KeychainStore.read("repVitalsImportKey"),
              let url = URL(string: "/api/vitals/import", relativeTo: URL(string: origin))?.absoluteURL else { throw SyncError.configurationMissing }
        var request = URLRequest(url: url); request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        request.setValue(key, forHTTPHeaderField: "x-rep-sync-key")
        request.httpBody = try JSONEncoder().encode(vitals)
        let (_, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw SyncError.serverRejected }
    }

    // GET /api/automation-health only checks the shared automation key, so this confirms
    // the origin and key are both correct without requesting HealthKit authorization.
    func testConnection() async throws -> String {
        guard let origin = UserDefaults.standard.string(forKey: "repOrigin"), !origin.isEmpty,
              let key = KeychainStore.read("repVitalsImportKey"), !key.isEmpty,
              let url = URL(string: "/api/automation-health", relativeTo: URL(string: origin))?.absoluteURL else {
            throw SyncError.configurationMissing
        }
        var request = URLRequest(url: url)
        request.setValue(key, forHTTPHeaderField: "x-rep-sync-key")
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw SyncError.serverRejected }
        if http.statusCode == 401 { throw SyncError.unauthorized }
        guard http.statusCode == 200 else { throw SyncError.serverRejected }
        return "Connected"
    }
}

enum KeychainStore {
    static func read(_ account: String) -> String? {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "RepHealthCompanion", kSecAttrAccount as String: account, kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess, let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }
    static func write(_ value: String, account: String) throws {
        let base: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "RepHealthCompanion", kSecAttrAccount as String: account]
        SecItemDelete(base as CFDictionary)
        var record = base; record[kSecValueData as String] = Data(value.utf8); record[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        guard SecItemAdd(record as CFDictionary, nil) == errSecSuccess else { throw SyncError.configurationMissing }
    }
}
