import ActivityKit
import Foundation

struct RepWorkoutActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var exercise: String
        var exerciseIndex: Int
        var exerciseCount: Int
        var currentSet: Int
        var setCount: Int
        var restEndsAt: Date?
        var isPaused: Bool
        var status: String
    }

    var workoutID: String
    var workoutName: String
    var startedAt: Date
}
