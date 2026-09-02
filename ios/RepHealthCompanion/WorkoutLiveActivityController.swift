import ActivityKit
import Foundation
import SwiftUI

@MainActor
final class WorkoutLiveActivityController: ObservableObject {
    static let shared = WorkoutLiveActivityController()
    @Published private(set) var activityID: String?
    @Published private(set) var state = RepWorkoutActivityAttributes.ContentState(
        exercise: "Chest Press", exerciseIndex: 1, exerciseCount: 5,
        currentSet: 1, setCount: 3, restEndsAt: nil, isPaused: false, status: "Training"
    )

    var isActive: Bool { activityID != nil }

    func start(workoutName: String = "Gym Session") async {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        if isActive { await end() }
        let attributes = RepWorkoutActivityAttributes(workoutID: UUID().uuidString, workoutName: workoutName, startedAt: .now)
        do {
            let activity = try Activity.request(attributes: attributes, content: ActivityContent(state: state, staleDate: nil), pushType: nil)
            activityID = activity.id
        } catch {
            activityID = nil
        }
    }

    func beginRest(seconds: TimeInterval = 90) async {
        state.restEndsAt = .now.addingTimeInterval(seconds)
        state.isPaused = false
        state.status = "Rest"
        await update()
    }

    func completeSet() async {
        if state.currentSet < state.setCount { state.currentSet += 1 }
        else { state.currentSet = 1; state.exerciseIndex = min(state.exerciseCount, state.exerciseIndex + 1) }
        state.restEndsAt = nil
        state.status = "Training"
        await update()
    }

    func end() async {
        for activity in Activity<RepWorkoutActivityAttributes>.activities {
            var final = state; final.status = "Complete"; final.restEndsAt = nil
            await activity.end(ActivityContent(state: final, staleDate: nil), dismissalPolicy: .default)
        }
        activityID = nil
    }

    private func update() async {
        for activity in Activity<RepWorkoutActivityAttributes>.activities {
            await activity.update(ActivityContent(state: state, staleDate: nil))
        }
    }
}
