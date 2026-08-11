import Foundation
import HealthKit

@MainActor
final class HealthKitBridge: ObservableObject {
    @Published var status = "Not connected"
    @Published var hasError = false
    @Published var isSyncing = false
    @Published var lastSyncText = "Never"

    private let store = HKHealthStore()
    private let endpoint = URL(string: "https://rep-gym-companion.mohamedahmedhosny95.workers.dev/api/vitals/import")!
    private var observers: [HKObserverQuery] = []

    init() {
        if let key = KeychainStore.load(), !key.isEmpty { startObservers(readableTypes(), pairingKey: key) }
    }

    func authorizeAndSync(pairingKey: String) async {
        guard HKHealthStore.isHealthDataAvailable() else { fail("Health data is unavailable on this device."); return }
        isSyncing = true; hasError = false
        do {
            let types = readableTypes()
            try await store.requestAuthorization(toShare: [], read: types)
            KeychainStore.save(pairingKey)
            try await syncToday(pairingKey: pairingKey)
            enableBackgroundDelivery(types)
            startObservers(types, pairingKey: pairingKey)
            status = "Connected. Today’s summary is synced."
            lastSyncText = Date.now.formatted(date: .abbreviated, time: .shortened)
        } catch { fail(error.localizedDescription) }
        isSyncing = false
    }

    private func readableTypes() -> Set<HKObjectType> {
        let quantities: [HKQuantityTypeIdentifier] = [.heartRateVariabilitySDNN, .restingHeartRate, .respiratoryRate, .activeEnergyBurned, .stepCount, .appleExerciseTime, .appleStandTime, .vo2Max, .oxygenSaturation]
        var types = Set(quantities.compactMap(HKObjectType.quantityType(forIdentifier:)))
        if let sleep = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) { types.insert(sleep) }
        if #available(iOS 16.0, *), let temperature = HKObjectType.quantityType(forIdentifier: .appleSleepingWristTemperature) { types.insert(temperature) }
        return types
    }

    private func syncToday(pairingKey: String) async throws {
        let calendar = Calendar.current, end = Date(), start = calendar.startOfDay(for: end)
        let sleepStart = calendar.date(byAdding: .day, value: -1, to: start)!
        let sleep = try await sleepSummary(from: sleepStart, to: end)
        let payload = DailyHealthPayload(
            date: ISO8601DateFormatter.day.string(from: end), sleepHours: sleep.total, bedtime: sleep.bedtime,
            wakeTime: sleep.wake, hrvMs: try await average(.heartRateVariabilitySDNN, unit: .secondUnit(with: .milli), from: start, to: end),
            restingHrBpm: try await average(.restingHeartRate, unit: HKUnit.count().unitDivided(by: .minute()), from: start, to: end),
            respiratoryRateBpm: try await average(.respiratoryRate, unit: HKUnit.count().unitDivided(by: .minute()), from: start, to: end),
            activeEnergyKcal: try await sum(.activeEnergyBurned, unit: .kilocalorie(), from: start, to: end),
            steps: try await sum(.stepCount, unit: .count(), from: start, to: end),
            exerciseMinutes: try await sum(.appleExerciseTime, unit: .minute(), from: start, to: end),
            standMinutes: try await sum(.appleStandTime, unit: .minute(), from: start, to: end),
            vo2Max: try await average(.vo2Max, unit: HKUnit(from: "ml/kg*min"), from: calendar.date(byAdding: .day, value: -30, to: end)!, to: end),
            oxygenSaturationPct: (try await average(.oxygenSaturation, unit: .percent(), from: start, to: end)).map { $0 * 100 },
            wristTemperatureC: try await wristTemperature(from: start, to: end), sleepDeepHours: sleep.deep, sleepRemHours: sleep.rem, source: "Rep HealthKit Bridge"
        )
        var request = URLRequest(url: endpoint); request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        request.setValue(pairingKey, forHTTPHeaderField: "x-rep-sync-key")
        request.httpBody = try JSONEncoder().encode(payload)
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else { throw BridgeError.uploadFailed }
    }

    private func average(_ id: HKQuantityTypeIdentifier, unit: HKUnit, from: Date, to: Date) async throws -> Double? { try await statistic(id, option: .discreteAverage, unit: unit, from: from, to: to) }
    private func sum(_ id: HKQuantityTypeIdentifier, unit: HKUnit, from: Date, to: Date) async throws -> Double? { try await statistic(id, option: .cumulativeSum, unit: unit, from: from, to: to) }
    private func statistic(_ id: HKQuantityTypeIdentifier, option: HKStatisticsOptions, unit: HKUnit, from: Date, to: Date) async throws -> Double? {
        guard let type = HKObjectType.quantityType(forIdentifier: id) else { return nil }
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: HKQuery.predicateForSamples(withStart: from, end: to), options: option) { _, result, error in
                if let error { continuation.resume(throwing: error); return }
                let quantity = option == .cumulativeSum ? result?.sumQuantity() : result?.averageQuantity()
                continuation.resume(returning: quantity?.doubleValue(for: unit))
            }
            store.execute(query)
        }
    }

    private func sleepSummary(from: Date, to: Date) async throws -> (total: Double?, deep: Double?, rem: Double?, bedtime: String?, wake: String?) {
        guard let type = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else { return (nil,nil,nil,nil,nil) }
        let samples: [HKCategorySample] = try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(sampleType: type, predicate: HKQuery.predicateForSamples(withStart: from, end: to), limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, results, error in
                if let error { continuation.resume(throwing: error) } else { continuation.resume(returning: results as? [HKCategorySample] ?? []) }
            }; store.execute(query)
        }
        let asleep = samples.filter { [HKCategoryValueSleepAnalysis.asleep.rawValue, HKCategoryValueSleepAnalysis.asleepCore.rawValue, HKCategoryValueSleepAnalysis.asleepDeep.rawValue, HKCategoryValueSleepAnalysis.asleepREM.rawValue].contains($0.value) }
        let hours: ([HKCategorySample]) -> Double? = { rows in rows.isEmpty ? nil : rows.reduce(0) { $0 + $1.endDate.timeIntervalSince($1.startDate) } / 3600 }
        let format = DateFormatter(); format.dateFormat = "HH:mm"
        return (hours(asleep), hours(asleep.filter{$0.value == HKCategoryValueSleepAnalysis.asleepDeep.rawValue}), hours(asleep.filter{$0.value == HKCategoryValueSleepAnalysis.asleepREM.rawValue}), asleep.map(\.startDate).min().map(format.string), asleep.map(\.endDate).max().map(format.string))
    }

    private func wristTemperature(from: Date, to: Date) async throws -> Double? {
        if #available(iOS 16.0, *) { return try await average(.appleSleepingWristTemperature, unit: .degreeCelsius(), from: from, to: to) }
        return nil
    }

    private func enableBackgroundDelivery(_ types: Set<HKObjectType>) { for case let type as HKSampleType in types { store.enableBackgroundDelivery(for: type, frequency: .daily) { _, _ in } } }
    private func startObservers(_ types: Set<HKObjectType>, pairingKey: String) {
        observers.forEach(store.stop); observers.removeAll()
        for case let type as HKSampleType in types {
            let query = HKObserverQuery(sampleType: type, predicate: nil) { [weak self] _, completion, error in
                guard error == nil else { completion(); return }
                Task { @MainActor in
                    if let self { try? await self.syncToday(pairingKey: pairingKey) }
                    completion()
                }
            }
            observers.append(query); store.execute(query)
        }
    }
    private func fail(_ message: String) { hasError = true; status = message }
}

private struct DailyHealthPayload: Encodable {
    let date: String, sleepHours: Double?, bedtime: String?, wakeTime: String?, hrvMs: Double?, restingHrBpm: Double?, respiratoryRateBpm: Double?, activeEnergyKcal: Double?, steps: Double?, exerciseMinutes: Double?, standMinutes: Double?, vo2Max: Double?, oxygenSaturationPct: Double?, wristTemperatureC: Double?, sleepDeepHours: Double?, sleepRemHours: Double?, source: String
    enum CodingKeys: String, CodingKey { case date, bedtime, steps, source; case sleepHours="sleep_hours", wakeTime="wake_time", hrvMs="hrv_ms", restingHrBpm="resting_hr_bpm", respiratoryRateBpm="respiratory_rate_bpm", activeEnergyKcal="active_energy_kcal", exerciseMinutes="exercise_minutes", standMinutes="stand_minutes", vo2Max="vo2_max", oxygenSaturationPct="oxygen_saturation_pct", wristTemperatureC="wrist_temperature_c", sleepDeepHours="sleep_deep_hours", sleepRemHours="sleep_rem_hours" }
}

private enum BridgeError: LocalizedError { case uploadFailed; var errorDescription: String? { "Health OS rejected the upload. Check the pairing key and Worker configuration." } }
private extension ISO8601DateFormatter { static let day: DateFormatter = { let value=DateFormatter(); value.calendar=.current; value.locale=Locale(identifier:"en_US_POSIX"); value.dateFormat="yyyy-MM-dd"; return value }() }
