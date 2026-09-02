# Rep Health Companion

Native HealthKit ingestion and workout Live Activity foundation for Rep Gym Companion. The target reads only user-authorized data, summarizes it by local calendar day on-device, and sends the minimum daily aggregate to the existing paired `/api/vitals/import` endpoint. The Live Activity adds current exercise, set, rest timer, workout status, and lock-screen/Dynamic Island controls.

## Xcode setup

1. Create an iOS 17+ SwiftUI app target named `RepHealthCompanion`.
2. Add the app files in this directory — including `Info.plist`, `RepWorkoutActivityAttributes.swift`, `WorkoutLiveActivityController.swift`, `WorkoutLiveActivityIntents.swift`, and `RepHealthCompanion.entitlements` — to the app target.
3. In **Signing & Capabilities**, choose your Apple ID team, add **HealthKit**, and enable **Background Delivery**. This should match the shipped `.entitlements` file rather than regenerate it.
4. Store the server URL and import key using the app’s Settings screen or managed configuration. Never place the import key in source control.
5. Register `HealthKitSyncCoordinator.bootstrap()` during app launch and after authorization.
6. Add a **Widget Extension** named `RepWorkoutLiveActivityWidget`, enable **Include Live Activity**, and add `RepWorkoutLiveActivityWidget.swift`, `RepWorkoutActivityAttributes.swift`, and `WorkoutLiveActivityIntents.swift` to that extension. Do not add the widget bundle file to the app target.
7. Confirm the app target's Info contains **Supports Live Activities** (`NSSupportsLiveActivities = YES`). App Intents make the Lock Screen and Dynamic Island controls interactive on iOS 17+.

The app intentionally does not upload raw heart-rate series. It derives counts and daily summaries locally, preserving the principle used by the web client: detailed samples remain on the device. Workout controls update ActivityKit state locally; HealthKit authorization and Live Activity authorization remain separate user-controlled permissions.
