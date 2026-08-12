# Rep Health Companion

Native HealthKit ingestion foundation for Rep Gym Companion. The target reads only user-authorized data, summarizes it by local calendar day on-device, and sends the minimum daily aggregate to the existing paired `/api/vitals/import` endpoint.

## Xcode setup

1. Create an iOS 17+ SwiftUI app target named `RepHealthCompanion`.
2. Add the files in this directory to the target.
3. Enable the HealthKit and Background Delivery capabilities.
4. Add `NSHealthShareUsageDescription`: “Rep uses your authorized Apple Health measurements to calculate personal recovery trends and data confidence.”
5. Store the server URL and import key using the app’s Settings screen or managed configuration. Never place the import key in source control.
6. Register `HealthKitSyncCoordinator.bootstrap()` during app launch and after authorization.

The app intentionally does not upload raw heart-rate series. It derives counts and daily summaries locally, preserving the principle used by the web client: detailed samples remain on the device.
