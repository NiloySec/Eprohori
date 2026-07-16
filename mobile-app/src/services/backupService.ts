import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useHistoryStore } from '../stores/historyStore';
import type { HistoryEntry } from '../stores/historyStore';

const BACKUP_VERSION = 1;

interface BackupFile {
  version: number;
  exportedAt: string;
  entries: HistoryEntry[];
}

// R7: export full history as JSON backup file
export async function exportBackup(): Promise<boolean> {
  try {
    const entries = useHistoryStore.getState().entries;
    if (entries.length === 0) return false;

    const payload: BackupFile = {
      version:    BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      entries,
    };

    const fileName = `eprohori_backup_${new Date().toISOString().split('T')[0]}.json`;
    const fileUri  = `${FileSystem.documentDirectory ?? ''}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2), {
      encoding: 'utf8',
    });

    const available = await Sharing.isAvailableAsync();
    if (!available) return false;

    await Sharing.shareAsync(fileUri, {
      mimeType:    'application/json',
      dialogTitle: 'EProhori ব্যাকআপ সেভ করুন',
      UTI:         'public.json',
    });
    return true;
  } catch {
    return false;
  }
}

// R7: import a previously exported backup JSON and merge entries
export async function importBackup(): Promise<{ imported: number; error?: string }> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type:      'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) return { imported: 0 };

    const uri     = result.assets[0].uri;
    const content = await FileSystem.readAsStringAsync(uri, { encoding: 'utf8' });
    const parsed  = JSON.parse(content) as BackupFile;

    if (parsed.version !== BACKUP_VERSION || !Array.isArray(parsed.entries)) {
      return { imported: 0, error: 'ফাইলটি সঠিক EProhori ব্যাকআপ নয়' };
    }

    const store         = useHistoryStore.getState();
    const existingIds   = new Set(store.entries.map((e) => e.id));
    const newEntries    = parsed.entries.filter((e) => !existingIds.has(e.id));

    newEntries.forEach((e) => {
      store.addEntry(e.message, e.result);
    });

    return { imported: newEntries.length };
  } catch (err) {
    return { imported: 0, error: 'ফাইল পড়তে সমস্যা হয়েছে' };
  }
}
