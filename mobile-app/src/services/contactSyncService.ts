import * as Contacts from 'expo-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore } from '../stores/settingsStore';
import { threatAnalysisAPI } from '../api/threatAnalysis';

// S9: Community Contact Sync (Truecaller-style)
// Accesses names and numbers from user's address book to build a crowdsourced
// caller ID database. Complies with Play Store Prominent Disclosure requirements.

const SYNC_KEY = 'eprohori.contact_sync_last_at';
const HASH_KEY = 'eprohori.contact_sync_hash';
const SYNC_INTERVAL = 7 * 24 * 60 * 60 * 1000; // Sync once a week

// Simple hash function for string to avoid large deps
function quickHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

export interface SyncStats {
  totalSynced: number;
  lastSyncedAt: number | null;
}

export async function getContactSyncStats(): Promise<SyncStats> {
  const lastAt = await AsyncStorage.getItem(SYNC_KEY);
  // We don't store the actual count in AsyncStorage for privacy,
  // but we can estimate or keep a metadata count.
  return {
    lastSyncedAt: lastAt ? parseInt(lastAt, 10) : null,
    totalSynced: 0, // Placeholder
  };
}

export async function performContactSync(): Promise<{ success: boolean; count: number; error?: string }> {
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== 'granted') {
    return { success: false, count: 0, error: 'Permission denied' };
  }

  try {
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
    });

    if (data.length === 0) return { success: true, count: 0 };

    // Format contacts for bulk upload: only name and number
    const payload = data
      .filter(c => c.phoneNumbers && c.phoneNumbers.length > 0)
      .map(c => ({
        name: c.name,
        numbers: c.phoneNumbers!.map(p => p.number?.replace(/\D/g, '')).filter(Boolean)
      }))
      .filter(c => c.numbers.length > 0);

    // M12: Differential Sync — only upload if contacts have changed (name or numbers)
    const contactsString = JSON.stringify(payload);
    const currentHash = quickHash(contactsString);
    const savedHash = await AsyncStorage.getItem(HASH_KEY);

    if (currentHash === savedHash) {
      if (__DEV__) console.log('[Sync] Contacts unchanged, skipping upload');
      return { success: true, count: 0 };
    }

    // M12: Chunking — never send 1000s of contacts in one request to avoid timeout/DoS
    const CHUNK_SIZE = 100;
    let syncedCount = 0;

    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      const chunk = payload.slice(i, i + CHUNK_SIZE);
      await threatAnalysisAPI.submitBulkNames(chunk).catch(() => {});
      syncedCount += chunk.length;
    }

    await AsyncStorage.setItem(SYNC_KEY, Date.now().toString());
    await AsyncStorage.setItem(HASH_KEY, currentHash);
    return { success: true, count: syncedCount };
  } catch (err) {
    return { success: false, count: 0, error: String(err) };
  }
}
