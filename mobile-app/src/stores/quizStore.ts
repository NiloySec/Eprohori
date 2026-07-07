import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// S6: Cyber Safety Quiz — local, static content, no network needed
export interface QuizQuestion {
  id: string;
  scenario: string;
  isScam: boolean;
  explanation: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    scenario: '"আপনার বিকাশ অ্যাকাউন্ট আজ রাতে বন্ধ হয়ে যাবে। এখনই আপনার পিন নম্বরটি রিপ্লাই করুন।"',
    isScam: true,
    explanation: 'বিকাশ কখনো SMS বা কলে পিন চায় না। এটি ১০০% প্রতারণা।',
  },
  {
    id: 'q2',
    scenario: '"আপনার bKash থেকে ৫০০ টাকা Cash Out সফল হয়েছে। ব্যালেন্স: ২,৩৪০ টাকা। ট্রানজেকশন আইডি: 8X7Y2Z।"',
    isScam: false,
    explanation: 'এটি স্বাভাবিক লেনদেন নিশ্চিতকরণ বার্তা — কোনো একশন চাওয়া হয়নি, তাই সন্দেহজনক নয়।',
  },
  {
    id: 'q3',
    scenario: '"অভিনন্দন! আপনি Grameenphone-এর ২৫তম বার্ষিকী লটারিতে ১০ লাখ টাকা জিতেছেন। পেতে এখানে ক্লিক করুন: bit.ly/gp-win"',
    isScam: true,
    explanation: 'না খেলেই পুরস্কার, আর ছোট URL — দুটোই ক্লাসিক লটারি স্ক্যামের লক্ষণ।',
  },
  {
    id: 'q4',
    scenario: '"আমি থানা থেকে বলছি, আপনার নামে মামলা হয়েছে। মামলা থেকে বাঁচতে এখনই ২০,০০০ টাকা এই বিকাশ নম্বরে পাঠান।"',
    isScam: true,
    explanation: 'পুলিশ কখনো ফোনে টাকা চায় না বা মামলা থেকে বাঁচাতে ঘুষ নেয় না — এটি ভয় দেখিয়ে প্রতারণা।',
  },
  {
    id: 'q5',
    scenario: '"আপনার NID আপডেট করতে হবে — এই লিংকে গিয়ে আপনার তথ্য দিন: election-bd-verify.com"',
    isScam: true,
    explanation: 'সরকারি ওয়েবসাইট সবসময় .gov.bd ডোমেইনে থাকে। এই ডোমেইনটি ভুয়া।',
  },
  {
    id: 'q6',
    scenario: '"আগামীকাল থেকে আপনার এলাকায় ঘূর্ণিঝড়ের কারণে বিদ্যুৎ বিচ্ছিন্ন থাকতে পারে। সতর্ক থাকুন। — BTRC"',
    isScam: false,
    explanation: 'এটি সরকারি দুর্যোগ সতর্কতা — কোনো টাকা বা ব্যক্তিগত তথ্য চাওয়া হয়নি।',
  },
  {
    id: 'q7',
    scenario: '"হাই, আমি বিদেশে থাকি, তোমাকে অনেক পছন্দ করি। একটা গিফট পাঠিয়েছি, কাস্টমসে আটকে গেছে — ছাড়াতে ১৫,০০০ টাকা লাগবে।"',
    isScam: true,
    explanation: 'ক্লাসিক রোমান্স স্ক্যাম — অপরিচিত বিদেশি "প্রেমিক/প্রেমিকা" + কাস্টমস ফি চাওয়া।',
  },
  {
    id: 'q8',
    scenario: '"আপনার পার্সেলটি সফলভাবে ডেলিভারি হয়েছে। ধন্যবাদ Daraz থেকে কেনাকাটার জন্য।"',
    isScam: false,
    explanation: 'সাধারণ ডেলিভারি কনফার্মেশন — কোনো লিংক বা তথ্য চাওয়া নেই।',
  },
];

interface QuizState {
  bestScore: number;
  totalPlayed: number;
  totalCorrect: number;
  setResult: (score: number, total: number) => void;
}

export const useQuizStore = create<QuizState>()(
  persist(
    (set, get) => ({
      bestScore: 0,
      totalPlayed: 0,
      totalCorrect: 0,
      setResult: (score, total) => {
        const s = get();
        set({
          bestScore: Math.max(s.bestScore, score),
          totalPlayed: s.totalPlayed + total,
          totalCorrect: s.totalCorrect + score,
        });
      },
    }),
    { name: 'quiz-storage', storage: createJSONStorage(() => AsyncStorage) }
  )
);
