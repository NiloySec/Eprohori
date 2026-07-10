# EProhori — manual device testing checklist

Automated checks (TypeScript, Jest, Gradle build) all pass, but the items
below involve real Android system dialogs and hardware that can't be
verified without a physical phone. Install `app-release.apk` and go through
this list once per release.

## Install

- [ ] Uninstall any previous EProhori build first if switching keystores (a
      release signed with a different key can't overwrite an existing install)
- [ ] Install `android/app/build/outputs/apk/release/app-release.apk`
- [ ] App opens, onboarding slides show, "notifications" permission prompt works

## Core scanning (no special permissions)

- [ ] Analyzer: paste a Bengali scam SMS → get a result with a correct percentage (e.g. "৮৭%", not "৮৭০০%")
- [ ] Analyzer: paste a safe message → shows "নিরাপদ"
- [ ] CallerID: check a known official number (999, 16247) → shows "ভেরিফাইড অফিসিয়াল নম্বর" badge
- [ ] CallerID: report a number as spam, then look it up again → spam score badge appears with a sane percentage
- [ ] History / Monitor / Settings tabs render without crashing

## P1 — Chat Guard (Notification Access)

- [ ] Settings → চ্যাট গার্ড → toggle on → system "Notification access" prompt appears
- [ ] Grant access, select WhatsApp as a watched app
- [ ] Send yourself (or have someone send) a WhatsApp message containing an obvious scam pattern (e.g. "আপনার বিকাশ পিন দিন")
- [ ] EProhori shows a MAX-priority warning notification within a few seconds
- [ ] Tapping the warning opens the Analyzer pre-filled with that message
- [ ] Toggle চ্যাট গার্ড off → confirm no more warnings fire for new messages

## P2 — Link Interceptor

- [ ] Tap any `http(s)://` link in another app (e.g. a browser bookmark, a note) → "Open with" chooser includes EProhori
- [ ] Choosing EProhori opens the Link Check screen with an instant local verdict
- [ ] "AI দিয়ে গভীর স্ক্যান করুন" button returns a result (needs internet)
- [ ] A known-safe HTTPS link shows a safe verdict + "ব্রাউজারে খুলুন" opens it in the real browser
- [ ] A fake bKash-lookalike domain (test with something like `http://bkash-verify.xyz`) shows a danger verdict and blocks the direct open button behind a confirmation

## P3 — Call Screening

- [ ] Settings → স্প্যাম কল ব্লকিং toggle on → Android's "Change default apps" role dialog appears
- [ ] Accept → toggle stays ON after returning to the app
- [ ] Add a real number you can call from (e.g. a second SIM/friend's phone) to the blocklist (CallerID → ব্লক করুন)
- [ ] Call the test phone FROM that blocked number → it should reject before ringing
- [ ] Decline the role dialog on a fresh toggle → confirm the toggle flips back OFF automatically within a few seconds of returning to the app (regression test for the "false ON" bug fixed 2026-07-06)
- [ ] Toggle off → call from the same number again → it rings normally (regression test for "blocklist stuck after disable" bug)

## S1 — Clipboard Guard

- [ ] Copy a phone number from any app (e.g. Contacts) → return to EProhori → a small banner appears offering to check it
- [ ] Copy a URL → same banner appears for links
- [ ] Dismiss with the X → banner doesn't reappear for the same clipboard content

## S2 — Senior Mode

- [ ] Settings → সিনিয়র মোড on → Home tab replaced by 3 giant buttons
- [ ] "মেসেজ চেক করুন" → opens Analyzer
- [ ] "নম্বর চেক করুন" → opens CallerID
- [ ] "জরুরি সাহায্য" → confirmation dialog → (cancel, don't actually call 999 during testing)
- [ ] "সম্পূর্ণ মোড দেখুন" → returns to the normal dashboard

## S3 — Family Guardian Alert

- [ ] Settings → ফ্যামিলি গার্ডিয়ান অ্যালার্ট on, enter a real number you can check, threshold 90%
- [ ] Analyze a message that scores ≥90% confidence → SMS compose screen opens pre-filled with a warning message addressed to that number
- [ ] Confirm it does NOT send automatically — you must tap send yourself

## S4 — Voice Alert

- [ ] Settings → ভয়েস সতর্কতা on
- [ ] Analyze a threat message → Result screen speaks the verdict aloud in Bengali
- [ ] Tap "শুনুন"/"থামান" to replay/stop manually

## S5 — Emergency SOS

- [ ] Analyze a message scoring ≥90% → red SOS button appears on the Result screen
- [ ] Tap it → confirmation dialog (cancel, don't actually dial during testing)

## S6 — Cyber Quiz

- [ ] CyberSafety screen → কুইজ খেলুন → answer all questions → final score screen shows, "আবার খেলুন" restarts

## S7 — Home Widget

- [ ] Long-press home screen → widgets → add the EProhori widget
- [ ] Widget shows "আজ এখনো কোনো স্ক্যান হয়নি" initially
- [ ] Analyze a message in-app → return to home screen → widget stats update within a few seconds
- [ ] Tap widget's "বার্তা বিশ্লেষণ" / "নম্বর চেক" buttons → opens the correct screen

## Regression checks for fixed bugs

- [ ] SMSScanScreen batch scan: paste several messages, separated by blank lines → each result shows a plausible % (not thousands of percent)
- [ ] Reboot the phone → home widget still shows correct last-known stats (SharedPreferences persisted)
