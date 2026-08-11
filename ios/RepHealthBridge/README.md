# Rep Health Bridge for iPhone

This small native companion reads Apple Health with your permission and sends one daily summary to the existing Health OS Worker. The web app remains the main interface; detailed HealthKit samples stay in Apple Health and on your phone.

## What it imports

Sleep duration and timing, HRV, resting heart rate, respiratory rate, active energy, steps, exercise minutes, stand minutes, VO₂ max, oxygen saturation, wrist temperature, and deep/REM sleep when available.

## One-time Xcode setup

1. On a Mac with Xcode, create a new **iOS App** named `RepHealthBridge` using SwiftUI.
2. Replace the generated Swift files with the files in this folder.
3. Add `Info.plist` and `RepHealthBridge.entitlements` to the target.
4. In **Signing & Capabilities**, choose your Apple ID team, add **HealthKit**, and enable **Background delivery**.
5. Build to your iPhone. Enter the same `REP_SYNC_KEY` used by the web app and tap **Test connection**. When it passes, tap **Authorize & sync**.

Apple requires a signed native iOS app for HealthKit. A browser/PWA cannot receive HealthKit data directly. A free Apple ID can install the bridge on your own phone for development; a paid Apple Developer membership is needed for normal App Store/TestFlight distribution and longer-lived provisioning.

The default endpoint is:

`https://rep-gym-companion.mohamedahmedhosny95.workers.dev/api/vitals/import`

The connection test uses `/api/automation-health`; it validates the automation
credential and Worker/KV readiness without reading or uploading Health data.

The pairing key is stored in the iOS Keychain, not in UserDefaults. Do not commit a real key into this folder.
