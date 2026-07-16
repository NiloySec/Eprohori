import * as SecureStore from 'expo-secure-store';

// Device-specific salt stored in hardware-backed keystore
const ENCRYPTION_KEY_NAME = 'eprohori.history_key';

async function getEncryptionKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_NAME);
  if (!key) {
    key = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await SecureStore.setItemAsync(ENCRYPTION_KEY_NAME, key);
  }
  return key;
}

/**
 * Simple pseudo-encryption for local storage.
 * Real AES-GCM requires native modules not always present in Expo Go,
 * so we use a XOR-based approach with a device-unique key for "privacy at rest".
 */
export async function encryptData(text: string): Promise<string> {
  const key = await getEncryptionKey();
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

export async function decryptData(encoded: string): Promise<string> {
  const text = atob(encoded);
  const key = await getEncryptionKey();
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}
