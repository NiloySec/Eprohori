// N5: screenshot OCR — extracts text from a picked image using ML Kit
// (@react-native-ml-kit/text-recognition). Null-safe: returns a clear error
// in Expo Go where the native module isn't linked.

import * as ImagePicker from 'expo-image-picker';

// Dynamic require so Metro doesn't crash in environments without the module
let TextRecognition: { recognize: (uri: string) => Promise<{ text: string }> } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@react-native-ml-kit/text-recognition');
  TextRecognition = mod?.default ?? mod;
} catch {
  TextRecognition = null;
}

export interface OcrResult {
  text: string;
  error?: 'cancelled' | 'unavailable' | 'no_text' | 'failed';
}

export function isOcrAvailable(): boolean {
  return !!TextRecognition;
}

// Pick a screenshot from the gallery and extract its text
export async function pickAndExtractText(): Promise<OcrResult> {
  if (!TextRecognition) return { text: '', error: 'unavailable' };

  try {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });
    if (picked.canceled || !picked.assets?.[0]?.uri) {
      return { text: '', error: 'cancelled' };
    }

    const result = await TextRecognition.recognize(picked.assets[0].uri);
    const text = (result?.text ?? '').trim();
    if (!text) return { text: '', error: 'no_text' };

    // Same sanitation as share-intent input: strip control chars, cap length
    const clean = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, 3000);
    return { text: clean };
  } catch {
    return { text: '', error: 'failed' };
  }
}
