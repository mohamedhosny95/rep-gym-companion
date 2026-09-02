import ActivityKit
import AppIntents
import Foundation

@available(iOS 17.0, *)
struct CompleteWorkoutSetIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Complete Set"
    func perform() async throws -> some IntentResult {
        for activity in Activity<RepWorkoutActivityAttributes>.activities {
            var state = activity.content.state
            if state.currentSet < state.setCount { state.currentSet += 1 }
            else { state.currentSet = 1; state.exerciseIndex = min(state.exerciseCount, state.exerciseIndex + 1) }
            state.restEndsAt = nil; state.isPaused = false; state.status = "Training"
            await activity.update(ActivityContent(state: state, staleDate: nil))
        }
        return .result()
    }
}

@available(iOS 17.0, *)
struct ToggleWorkoutRestIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Pause or Resume Rest"
    func perform() async throws -> some IntentResult {
        for activity in Activity<RepWorkoutActivityAttributes>.activities {
            var state = activity.content.state
            state.isPaused.toggle()
            state.status = state.isPaused ? "Rest paused" : "Rest"
            if !state.isPaused && state.restEndsAt == nil { state.restEndsAt = .now.addingTimeInterval(90) }
            await activity.update(ActivityContent(state: state, staleDate: nil))
        }
        return .result()
    }
}

@available(iOS 17.0, *)
struct EndWorkoutIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "End Workout"
    func perform() async throws -> some IntentResult {
        for activity in Activity<RepWorkoutActivityAttributes>.activities {
            var state = activity.content.state; state.status = "Complete"; state.restEndsAt = nil
            await activity.end(ActivityContent(state: state, staleDate: nil), dismissalPolicy: .immediate)
        }
        return .result()
    }
}
