//
//  WatchWorkoutSessionManager.swift
//  Rep Gym Companion - watchOS Native Workout Manager
//

import Foundation
import HealthKit
import WatchKit

@MainActor
final class WatchWorkoutSessionManager: NSObject, ObservableObject {
    private let healthStore = HKHealthStore()
    private var workoutSession: HKWorkoutSession?
    private var workoutBuilder: HKLiveWorkoutBuilder?

    @Published var isRunning = false
    @Published var heartRate: Double = 0
    @Published var activeCalories: Double = 0
    @Published var elapsedTime: TimeInterval = 0
    
    // Workout tracking state
    @Published var currentExerciseName: String = "Chest Press"
    @Published var currentSet: Int = 1
    @Published var totalSets: Int = 4
    @Published var restTimerRemaining: Int = 0
    @Published var isResting = false

    private var restTimer: Timer?
    private var sessionTimer: Timer?

    override init() {
        super.init()
        requestHealthKitAuthorization()
    }

    func requestHealthKitAuthorization() {
        guard HKHealthStore.isHealthDataAvailable() else { return }

        let typesToShare: Set = [
            HKQuantityType.workoutType()
        ]

        let typesToRead: Set = [
            HKQuantityType.quantityType(forIdentifier: .heartRate)!,
            HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKQuantityType.quantityType(forIdentifier: .heartRateVariabilitySDNN)!
        ]

        healthStore.requestAuthorization(toShare: typesToShare, read: typesToRead) { success, error in
            if let error = error {
                print("HealthKit Auth Error: \(error.localizedDescription)")
            }
        }
    }

    func startWorkout(activityType: HKWorkoutActivityType = .traditionalStrengthTraining) {
        let configuration = HKWorkoutConfiguration()
        configuration.activityType = activityType
        configuration.locationType = .indoor

        do {
            workoutSession = try HKWorkoutSession(healthStore: healthStore, configuration: configuration)
            workoutBuilder = workoutSession?.associatedWorkoutBuilder()

            workoutSession?.delegate = self
            workoutBuilder?.delegate = self

            workoutBuilder?.dataSource = HKLiveWorkoutDataSource(
                healthStore: healthStore,
                workoutConfiguration: configuration
            )

            let startDate = Date()
            workoutSession?.startActivity(with: startDate)
            workoutBuilder?.beginCollection(withStart: startDate) { success, error in
                DispatchQueue.main.async {
                    self.isRunning = success
                    self.startSessionTimer()
                    WKInterfaceDevice.current().play(.start)
                }
            }
        } catch {
            print("Failed to start workout session: \(error)")
        }
    }

    func completeSet(restSeconds: Int = 90) {
        WKInterfaceDevice.current().play(.directionUp)
        if currentSet < totalSets {
            currentSet += 1
            startRestTimer(seconds: restSeconds)
        } else {
            WKInterfaceDevice.current().play(.success)
        }
    }

    func startRestTimer(seconds: Int) {
        restTimer?.invalidate()
        restTimerRemaining = seconds
        isResting = true

        restTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] timer in
            guard let self = self else { return }
            if self.restTimerRemaining > 1 {
                self.restTimerRemaining -= 1
            } else {
                self.restTimerRemaining = 0
                self.isResting = false
                timer.invalidate()
                WKInterfaceDevice.current().play(.notification)
            }
        }
    }

    func addRestTime(_ seconds: Int = 15) {
        restTimerRemaining += seconds
    }

    func skipRestTimer() {
        restTimer?.invalidate()
        restTimerRemaining = 0
        isResting = false
        WKInterfaceDevice.current().play(.click)
    }

    func endWorkout() {
        workoutSession?.end()
        workoutBuilder?.endCollection(withEnd: Date()) { success, error in
            self.workoutBuilder?.finishWorkout { workout, error in
                DispatchQueue.main.async {
                    self.isRunning = false
                    self.sessionTimer?.invalidate()
                    self.restTimer?.invalidate()
                    WKInterfaceDevice.current().play(.stop)
                }
            }
        }
    }

    private func startSessionTimer() {
        sessionTimer?.invalidate()
        elapsedTime = 0
        sessionTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            self.elapsedTime += 1
        }
    }
}

// MARK: - HKWorkoutSessionDelegate
extension WatchWorkoutSessionManager: HKWorkoutSessionDelegate {
    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState, from fromState: HKWorkoutSessionState, date: Date) {
        Task { @MainActor in
            self.isRunning = (toState == .running)
        }
    }

    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
        print("Workout session failed: \(error)")
    }
}

// MARK: - HKLiveWorkoutBuilderDelegate
extension WatchWorkoutSessionManager: HKLiveWorkoutBuilderDelegate {
    nonisolated func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

    nonisolated func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {
        for type in collectedTypes {
            guard let quantityType = type as? HKQuantityType else { continue }
            let statistics = workoutBuilder.statistics(for: quantityType)

            Task { @MainActor in
                if quantityType == HKQuantityType.quantityType(forIdentifier: .heartRate) {
                    let heartRateUnit = HKUnit.count().unitDivided(by: HKUnit.minute())
                    if let value = statistics?.mostRecentQuantity()?.doubleValue(for: heartRateUnit) {
                        self.heartRate = value
                    }
                } else if quantityType == HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) {
                    let calorieUnit = HKUnit.kilocalorie()
                    if let value = statistics?.sumQuantity()?.doubleValue(for: calorieUnit) {
                        self.activeCalories = value
                    }
                }
            }
        }
    }
}
