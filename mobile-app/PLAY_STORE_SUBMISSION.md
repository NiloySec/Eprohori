# EProhori — Play Console submission notes

## ⚠️ Signing key (read before you build for Play Store)

A fresh upload keystore was generated on 2026-07-06:

- File: `android/app/eprohori-release.keystore`
- Alias: `eprohori-upload`
- Password: stored in `android/keystore.properties` (gitignored — do NOT commit)
- `android/app/build.gradle` now signs release builds with this keystore automatically when `keystore.properties` is present.

**Back this keystore up now** — copy `android/app/eprohori-release.keystore` and `android/keystore.properties` to a password manager or offline backup. If you lose it after Play Store accepts your first upload, you can never publish an update under this app again (Google can help via Play App Signing key-reset only in limited cases, and it's slow).

**If EProhori is already live on Play Store under a different key**, do not use this new keystore to submit an update — it will be rejected. This keystore is only valid for a first submission or if Play App Signing is configured to accept a new upload key via Google's key-upgrade flow. Check your Play Console → App integrity → App signing before uploading.

## Sensitive permissions declaration

Play Console will ask you to justify these permissions in **App content → Permissions declaration** before it allows a release to go out:

### `QUERY_ALL_PACKAGES`
> **Core feature it's needed for:** EProhori's Fake App Detector (Settings → ভুয়া অ্যাপ স্ক্যানার) scans the list of installed apps to find lookalike/fraudulent banking and mobile-financial-service apps (fake bKash, Nagad, bank apps) that mimic official package names or app names. This is a fraud-protection feature core to the app's purpose — detecting malicious apps impersonating Bangladeshi financial institutions requires enumerating all installed packages; there is no narrower Android API that provides this without `QUERY_ALL_PACKAGES` on Android 11+.
>
> **Suggested Play Console category:** "App uses QUERY_ALL_PACKAGES to enable core user-facing features" → select the antivirus/security-scanner justification if offered, otherwise the free-text "Other" option with the paragraph above.

### Notification Access (`BIND_NOTIFICATION_LISTENER_SERVICE`)
> **Core feature it's needed for:** EProhori's Chat Guard (Settings → চ্যাট গার্ড) reads notification text from user-selected chat apps (WhatsApp, Telegram, Messenger, etc.) to scan incoming messages for scam/phishing patterns locally on-device, warning the user before they open a malicious message. This is opt-in, off by default, user picks which apps are watched, and no notification content ever leaves the device — analysis is 100% local pattern matching.
>
> Play Console usually requests a short demo video for Notification Access — record yourself: Settings → চ্যাট গার্ড toggle → system permission screen → granting it → receiving a test scam-pattern message → the in-app warning notification.

### SMS permissions (`READ_SMS`, `RECEIVE_SMS`)
> Already part of the app's core purpose (SMS scam scanning) — should already be declared from the original submission. No change needed unless Play Console flags it again.

### `READ_PHONE_STATE`, `READ_CALL_LOG`
> Used for caller-ID / spam-call detection (CallerID screen, Call Log screen) — core fraud-protection feature, same category as above.

## Pre-submission checklist

- [ ] Back up `eprohori-release.keystore` + `keystore.properties` outside this machine
- [ ] Bump `versionCode` and `versionName` in `android/app/build.gradle` before each new release (currently `versionCode 1`, `versionName "1.0.0"`)
- [ ] Build the release bundle for Play Store (AAB, not APK): `.\gradlew.bat bundleRelease` — outputs to `android/app/build/outputs/bundle/release/app-release.aab`
- [ ] Fill in the Data Safety form (SMS content, call log, location-adjacent district data, phone numbers — all processed on-device / to your own backend at `eprohori-production.up.railway.app`)
- [ ] Submit the two permission justifications above under App content → Permissions declaration
- [ ] If Notification Access is flagged for review, attach the demo video described above
