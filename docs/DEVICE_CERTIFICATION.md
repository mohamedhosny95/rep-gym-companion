# Mobile and accessibility certification

Automated Playwright certification covers the primary destinations at 320, 360, 375, 390, 414, and 430 CSS pixels; 44px primary targets; horizontal overflow; serious/critical WCAG A/AA axe findings; reduced motion; offline cold reload; LCP, CLS, and long-task budgets. Automation is necessary but not a substitute for hardware.

Before production promotion, record a pass/fail result and evidence for:

| Platform | Minimum coverage |
| --- | --- |
| iPhone Safari | current and previous iOS; install PWA, offline launch, keyboard, VoiceOver, HealthKit bridge |
| Android Chrome | current stable; install PWA, offline launch, TalkBack, push permission/reminder |
| Desktop Safari/Chrome/Firefox | pairing, backup import/export, keyboard-only navigation, 200% zoom |
| Display modes | light OS with dark app, increased contrast, reduced motion, text scaling, RTL Arabic |

Test pairing/revocation between two real devices, an interrupted sync that later recovers, expired push permission, wrong backup passphrase, schema-5 header tamper, and Notion outage recovery. Store screenshots or screen recordings plus OS/browser/build version. A release is not “real-device certified” until this matrix is signed by a human operator.
