import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

@available(iOSApplicationExtension 17.0, *)
@main
struct RepWorkoutWidgetBundle: WidgetBundle {
    var body: some Widget { RepWorkoutLiveActivityWidget() }
}

@available(iOSApplicationExtension 17.0, *)
struct RepWorkoutLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RepWorkoutActivityAttributes.self) { context in
            VStack(alignment: .leading, spacing: 10) {
                HStack { Text(context.attributes.workoutName).font(.headline); Spacer(); Text(context.state.status).foregroundStyle(.secondary) }
                Text(context.state.exercise).font(.title3.bold())
                HStack {
                    Text("Set \(context.state.currentSet)/\(context.state.setCount)")
                    Spacer()
                    if let end = context.state.restEndsAt, !context.state.isPaused { Text(timerInterval: Date.now...end, countsDown: true).monospacedDigit() }
                    Button(intent: ToggleWorkoutRestIntent()) { Image(systemName: context.state.isPaused ? "play.fill" : "pause.fill") }.buttonStyle(.bordered)
                    Button(intent: CompleteWorkoutSetIntent()) { Label("Set", systemImage: "checkmark") }.buttonStyle(.borderedProminent)
                }
            }.padding().activityBackgroundTint(Color.black).activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) { Text("\(context.state.currentSet)/\(context.state.setCount)").font(.headline) }
                DynamicIslandExpandedRegion(.trailing) { if let end=context.state.restEndsAt { Text(timerInterval: Date.now...end, countsDown: true).monospacedDigit() } }
                DynamicIslandExpandedRegion(.center) { Text(context.state.exercise).font(.headline) }
                DynamicIslandExpandedRegion(.bottom) { HStack { Button(intent: ToggleWorkoutRestIntent()) { Label("Rest", systemImage: "timer") }; Button(intent: CompleteWorkoutSetIntent()) { Label("Complete set", systemImage: "checkmark") }; Button(intent: EndWorkoutIntent()) { Image(systemName: "xmark") } } }
            } compactLeading: { Text("\(context.state.currentSet)") } compactTrailing: { Image(systemName: "figure.strengthtraining.traditional") } minimal: { Image(systemName: "figure.strengthtraining.traditional") }
            .keylineTint(.green)
        }
    }
}
