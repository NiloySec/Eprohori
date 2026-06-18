# Eprohori — National Pilot Plan

**A 3-month proof-of-impact pilot to validate Eprohori as national cyber-safety infrastructure for Bangladesh.**

Version 1.0 · Prepared for: internal execution → BGD e-GOV CIRT / ICT Division proposal

---

## নির্বাহী সারসংক্ষেপ (Executive Summary — Bangla)

Eprohori একটি ক্রাউডসোর্সড সাইবার থ্রেট রিপোর্টিং প্ল্যাটফর্ম, যা AI দিয়ে phishing/scam যাচাই করে (যাচাইকৃত নির্ভুলতা **৯৯.৩%**) এবং কমিউনিটিকে বাংলায় সতর্ক করে। এই pilot-এর লক্ষ্য একটি নিয়ন্ত্রিত পরিবেশে (একটি বিশ্ববিদ্যালয় ক্যাম্পাস) ৩ মাসে প্রমাণ করা যে platform-টি বাস্তব scam ধরতে, মানুষকে সতর্ক করতে, এবং জাতীয় পর্যায়ে scale করতে সক্ষম — সরকারি অংশীদারিত্বের আগে।

---

## 1. Why a pilot first

A national rollout without proof is a non-starter — officials fund *evidence*, not ideas. A focused pilot converts "a working app" into **"X students protected from Y real scams in Z weeks"** — the single most persuasive asset for a government proposal.

**The pilot must answer three questions:**
1. Will real people actually report threats? (adoption)
2. Does the AI catch real-world Bangla scams, not just test data? (accuracy in the wild)
3. Does an alert actually stop someone from being scammed? (impact)

---

## 2. Pilot site selection

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **One university campus** | Defined population, tech-literate, easy recruitment, high scam exposure (scholarship/job/mobile-banking fraud) | Not representative of rural BD | ✅ **Recommended** |
| One district | Representative | Hard to recruit, slow, needs local partner | ❌ Too big for v1 |
| Online-only (social media) | Fast reach | No controlled measurement, noisy data | ❌ Can't prove impact |

**Recommendation:** Start with **one university** (your own or a partner). Target: **300–500 active students** in 3 months. University students are heavily targeted by scholarship scams, fake job offers, bKash/Nagad fraud, and SIM-replacement attacks — high signal density.

**Stretch:** Recruit a campus **IT/Cyber club** as co-organisers — gives you boots on the ground.

---

## 3. Target users & recruitment

**Goal:** 300+ registered users, 100+ active reporters over 12 weeks.

| Channel | Tactic |
|---------|--------|
| Campus Facebook groups | Posts + a real scam case study ("এই SMS-টা আসল না নকল?") |
| Department class reps | 5-minute in-class intro + QR code to eprohori.tech |
| Cyber/IT club | Co-host a "Spot the Scam" workshop using Eprohori live |
| Poster + QR | Cafeteria, library, halls |
| Word of mouth | Leaderboard gamification (already built — XP, badges, ranks) |

**Incentive:** Top 10 reporters get a certificate ("Eprohori Campus Cyber Ranger") — cheap, motivating, resume-worthy for students.

---

## 4. What to measure (the proof)

These metrics ARE the government pitch. Eprohori already records most of this in its DB.

### Adoption metrics
- Registered users (weekly cumulative)
- Active reporters (submitted ≥1 report)
- Reports submitted (total + per week)
- District/dept coverage

### Accuracy metrics (the credibility core)
- AI confidence distribution of submitted reports
- **Admin-verified true-positive rate** — of reports the AI flagged as threats, how many were genuinely malicious (human-checked)
- **False-positive rate** — legitimate messages wrongly flagged
- Compare in-the-wild accuracy vs the 99.3% benchmark (honest: expect it to be lower on novel data — that gap is itself a finding)

### Impact metrics (the emotional close)
- Verified threats that triggered district alerts
- People alerted (Eprohori already computes `alerted_people`)
- **Self-reported "saved" cases** — short in-app survey: "এই alert কি আপনাকে scam থেকে বাঁচিয়েছে?" → count of "yes"
- Unique scam campaigns detected (e.g., a fake-scholarship wave)

### Qualitative
- 5–10 short testimonials ("আমি প্রায় টাকা পাঠিয়ে দিচ্ছিলাম, Eprohori alert দেখে থেমে গেলাম")
- 2–3 documented real scam campaigns caught early

---

## 5. Timeline (12 weeks)

| Week | Phase | Activities |
|------|-------|-----------|
| 0 | **Prep** | Finalise pilot site, recruit 2–3 campus volunteers, print QR posters, set up a weekly metrics dashboard (use `/stats` + `/api/admin/backup`) |
| 1–2 | **Launch** | Class intros, FB posts, workshop. Target: 100 sign-ups |
| 3–6 | **Growth** | Weekly "scam of the week" posts, leaderboard push. Target: 300 users, steady reports |
| 7–10 | **Active monitoring** | Daily admin verification, send real alerts, collect testimonials, run the in-app "did this save you?" survey |
| 11 | **Analysis** | Compile all metrics, compute in-the-wild accuracy, identify caught campaigns |
| 12 | **Report** | Write the **Pilot Impact Report** → becomes the core of the CIRT/ICT proposal |

---

## 6. Success criteria (go / no-go for scaling)

| Metric | Minimum (proceed) | Strong (compelling) |
|--------|-------------------|---------------------|
| Registered users | 300 | 500+ |
| Active reporters | 80 | 150+ |
| Verified real threats | 30 | 80+ |
| In-the-wild AI true-positive rate | ≥ 85% | ≥ 92% |
| Documented "saved" cases | 5 | 20+ |
| Real campaigns caught | 1 | 3+ |

If you hit the "minimum" column, you have a **fundable, government-presentable result.**

---

## 7. Risks & mitigation

| Risk | Mitigation |
|------|-----------|
| Low adoption | Lead with a real, scary local scam case; gamify hard; recruit club co-owners |
| AI underperforms on novel scams | Honest reporting + the multi-LLM fallback layer; frame gap as "needs national data to improve" (a partnership ask) |
| Spam / fake reports | Rate-limiting + admin verification already built; trust-scoring |
| Single admin can't keep up | Recruit 2 student moderators; document the workflow |
| Privacy concern | Anonymise public data; point to SECURITY.md + privacy policy |
| Data on US servers | Acknowledge openly; "BD data-center migration" becomes part of the gov ask |

---

## 8. Budget (lean — solo/student executable)

| Item | Est. cost (BDT) |
|------|-----------------|
| Hosting (Railway + Vercel, current) | ~0 (free/trial tiers) |
| Domain (eprohori.tech) | already owned |
| Posters + printing | 1,000–2,000 |
| Workshop refreshments | 2,000–3,000 |
| Certificates (digital) | 0 |
| **Total** | **< 5,000 BDT** |

A national-grade proof for under 5,000 taka. That ratio itself is a pitch point.

---

## 9. How the pilot feeds the government proposal

The **Pilot Impact Report** (Week 12) directly supplies every section a CIRT/ICT proposal needs:

| Proposal section | Pilot output that fills it |
|------------------|----------------------------|
| Problem statement | Real scams documented on campus |
| Proven solution | Adoption + accuracy + impact metrics |
| Credibility | 99.3% benchmark + in-the-wild validation |
| Cost-effectiveness | < 5,000 BDT for N protected users |
| The ask | "Scale nationally with gov mandate + BD data center + funding" |
| Risk awareness | This document's risk table |

---

## 10. Immediate next steps (this week)

1. [ ] Pick the pilot university + confirm 2–3 volunteers
2. [ ] Draft the "scam of the week" launch post (1 real local example)
3. [ ] Print 10 QR posters → eprohori.tech
4. [ ] Add a one-question in-app survey: *"এই alert কি আপনাকে scam থেকে বাঁচিয়েছে?"* (feeds impact metric)
5. [ ] Set up a simple weekly metrics sheet (pull from `/stats`)
6. [ ] Book one class intro + one club workshop

---

*Once the pilot delivers, the next document is the **Government Concept Note** — and it will be backed by real numbers, not promises.*
