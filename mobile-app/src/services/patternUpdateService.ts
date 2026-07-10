import AsyncStorage from '@react-native-async-storage/async-storage';
import { threatAnalysisAPI } from '../api/threatAnalysis';

// M17: Dynamic Pattern Updater — fetches latest regex rules from backend
// Allows the app to detect new scam waves without an App Store update.

const PATTERNS_KEY = 'eprohori.dynamic_patterns';
const VERSION_KEY  = 'eprohori.patterns_version';

export interface DynamicPattern {
  id: string;
  regex: string;
  label: string;
  severity: string;
}

export async function fetchLatestPatterns(): Promise<void> {
  try {
    const response = await fetch('https://eprohori-production.up.railway.app/api/rules/patterns');
    if (!response.ok) return;

    const data = await response.json();
    const localVersion = await AsyncStorage.getItem(VERSION_KEY);

    if (data.version !== localVersion) {
      await AsyncStorage.setItem(PATTERNS_KEY, JSON.stringify(data.patterns));
      await AsyncStorage.setItem(VERSION_KEY, data.version);
      if (__DEV__) console.log(`[Patterns] Updated to version ${data.version}`);
    }
  } catch (err) {
    if (__DEV__) console.error('[Patterns] Update failed', err);
  }
}

export async function getLocalPatterns(): Promise<DynamicPattern[]> {
  try {
    const saved = await AsyncStorage.getItem(PATTERNS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}
