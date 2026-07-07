# EProhori - হুমকি সনাক্তকারী

রিয়েল-টাইম SMS স্কাম, ফিশিং এবং জালিয়াতি সনাক্তকরণ বাংলাদেশের জন্য।

## প্রকল্প তথ্য

- **নাম:** EProhori
- **সংস্করণ:** 1.0.0
- **প্রযুক্তি:** React Native + TypeScript
- **প্ল্যাটফর্ম:** Android এবং iOS

## ফোল্ডার কাঠামো

```
mobile-app/
├── src/
│   ├── screens/           # সব স্ক্রিন components
│   ├── components/        # পুনঃব্যবহারযোগ্য UI components
│   ├── navigation/        # নেভিগেশন সেটআপ
│   ├── api/               # API integration
│   ├── stores/            # Zustand state management
│   ├── theme/             # ডিজাইন সিস্টেম (colors, typography, spacing)
│   ├── utils/             # Utility functions
│   └── App.tsx            # Main App component
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── jest.config.js         # Testing config
└── README.md              # এই ফাইল
```

## সেটআপ নির্দেশিকা

### প্রয়োজনীয় যন্ত্রপাতি

- Node.js 16+
- npm বা yarn
- Android Studio (Android অ্যাপের জন্য)
- Xcode (iOS অ্যাপের জন্য, Mac শুধুমাত্র)

### ইনস্টলেশন

```bash
# Dependencies ইনস্টল করুন
npm install

# বা Yarn ব্যবহার করুন
yarn install
```

### পরিবেশ সেটআপ

```bash
# .env ফাইল তৈরি করুন
cp .env.example .env

# আপনার API endpoint যোগ করুন
API_BASE_URL=https://eprohori-production.up.railway.app
```

### চলমান অ্যাপ্লিকেশন

**Android:**
```bash
npm run android
```

**iOS:**
```bash
npm run ios
```

**ডেভেলপমেন্ট সার্ভার:**
```bash
npm start
```

## বৈশিষ্ট্য

- ✅ রিয়েল-টাইম হুমকি বিশ্লেষণ
- ✅ SMS, ইমেইল এবং URL সমর্থন
- ✅ আত্মবিশ্বাস স্কোর প্রদর্শন
- ✅ বাংলা ভাষা সমর্থন
- ✅ সনাক্তকরণ ইতিহাস
- ✅ হুমকি মনিটর ড্যাশবোর্ড
- ✅ স্থানীয় ডেটা সংরক্ষণ
- ✅ পুশ বিজ্ঞপ্তি সমর্থন

## পরীক্ষা

### ইউনিট টেস্ট চালান

```bash
npm test
```

### টেস্ট ওয়াচ মোড

```bash
npm run test:watch
```

### কভারেজ রিপোর্ট

```bash
npm run test:coverage
```

## লিন্টিং এবং টাইপ চেকিং

```bash
# ESLint চালান
npm run lint

# TypeScript চেক করুন
npm run type-check
```

## স্ক্রিন বিবরণ

### হোম স্ক্রিন
- পরিসংখ্যান কার্ড (গুরুতর, সন্দেহজনক, নিরাপদ)
- সাম্প্রতিক সনাক্তকরণ
- দ্রুত বিশ্লেষণ বোতাম

### বিশ্লেষক স্ক্রিন
- বার্তা ইনপুট এলাকা
- ভাষা নির্বাচন
- ক্লিপবোর্ড থেকে পেস্ট করুন
- রিয়েল-টাইম বিশ্লেষণ

### ফলাফল স্ক্রিন
- হুমকি আইকন এবং শিরোনাম
- আত্মবিশ্বাস বার
- সমাধান পদক্ষেপ
- প্রতিরোধ পরামর্শ

### মনিটর স্ক্রিন
- হুমকি পরিসংখ্যান
- হুমকির ধরন বিতরণ
- সাম্প্রতিক সনাক্তকরণ তালিকা

### ইতিহাস স্ক্রিন
- সব সনাক্তকরণের তালিকা
- ফিল্টার বিকল্প
- মুছে ফেলার ক্রিয়া

### সেটিংস স্ক্রিন
- বিজ্ঞপ্তি পছন্দ
- ভাষা নির্বাচন
- ডেটা ম্যানেজমেন্ট
- সংস্করণ তথ্য

## API ইন্টিগ্রেশন

অ্যাপ্লিকেশন নিম্নলিখিত API এন্ডপয়েন্ট ব্যবহার করে:

### POST /api/chatbot/analyze

**অনুরোধ:**
```json
{
  "message": "সন্দেহজনক বার্তা...",
  "language": "bn"
}
```

**প্রতিক্রিয়া:**
```json
{
  "threat_type": "phishing",
  "confidence": 0.92,
  "message": "এটি ফিশিং চেষ্টা",
  "solution_steps": ["সেই লিঙ্কে যাবেন না", "প্রেরক ব্লক করুন"],
  "prevention_tips": ["সবসময় অফিসিয়াল সাইট ব্যবহার করুন"]
}
```

## স্থিতি পরিচালনা (Zustand)

অ্যাপ্লিকেশন Zustand ব্যবহার করে অবস্থা পরিচালনা করে:

- `analysisStore` - বর্তমান বিশ্লেষণ
- `historyStore` - সনাক্তকরণ ইতিহাস
- `settingsStore` - ব্যবহারকারীর পছন্দ

```typescript
import { useAnalysisStore } from '@stores';

const { currentResult, setResult } = useAnalysisStore();
```

## ডিজাইন সিস্টেম

### রং

```typescript
Colors.primary      // #1a0a1f (ডার্ক পার্পল)
Colors.accent       // #00ffcc (সাইয়ান)
Colors.safe         // #00dd99 (সবুজ)
Colors.suspicious   // #ffb300 (হলুদ)
Colors.threat       // #ff5555 (লাল)
```

### স্পেসিং

```typescript
Spacing.xs  // 4px
Spacing.sm  // 8px
Spacing.md  // 12px
Spacing.lg  // 16px
Spacing.xl  // 20px
```

## স্থানীয়করণ

বর্তমানে সমর্থিত ভাষা:
- বাংলা (bn)
- ইংরেজি (en)

নতুন ভাষা যোগ করতে, অনুবাদ ফাইল আপডেট করুন এবং ভাষা নির্বাচন পছন্দ আপডেট করুন।

## নিরাপত্তা বিবেচনা

- সব API কল HTTPS ব্যবহার করে
- সংবেদনশীল ডেটা স্থানীয়ভাবে এনক্রিপ্ট করা হয়
- ইনপুট যাচাইকরণ সর্বত্র প্রয়োগ করা হয়
- ব্যবহারকারীর PII সংগ্রহ করা হয় না

## পারফরম্যান্স অপ্টিমাইজেশন

- React hooks মেমোইজেশন
- Lazy screen loading
- ইমেজ অপ্টিমাইজেশন
- প্রতিক্রিয়া ভার্চুয়ালাইজেশন

## উন্নয়ন সাহায্য

- **React Native ডক:** https://reactnative.dev
- **TypeScript ডক:** https://www.typescriptlang.org
- **Zustand ডক:** https://github.com/pmndrs/zustand

## লাইসেন্স

মালিকানা - EProhori 2026

## সহায়তা

সমস্যা বা প্রশ্নের জন্য, support@eprohori.bd এ যোগাযোগ করুন।
