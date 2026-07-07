import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { HistoryEntry } from '../stores/historyStore';

export const exportHistoryCSV = async (
  entries: HistoryEntry[],
  language: 'bn' | 'en' = 'bn'
): Promise<boolean> => {
  if (entries.length === 0) return false;

  const header = language === 'bn'
    ? 'তারিখ,বার্তা,ধরন,নিশ্চয়তা (%),নিরাপদ\n'
    : 'Date,Message,Type,Confidence (%),Safe\n';

  const rows = entries.map((e) => {
    const date = new Date(e.timestamp).toISOString().split('T')[0];
    const msg = `"${e.message.replace(/"/g, '""').replace(/[\r\n]/g, ' ')}"`; // M14: escape \r\n (RFC 4180)
    const type = e.result.threat_type;
    const conf = e.result.confidence.toFixed(1);
    const safe = e.result.confidence < 60
      ? (language === 'bn' ? 'হ্যাঁ' : 'Yes')
      : (language === 'bn' ? 'না' : 'No');
    return `${date},${msg},${type},${conf},${safe}`;
  });

  const csv = header + rows.join('\n');
  const fileName = `eprohori_history_${new Date().toISOString().split('T')[0]}.csv`;
  const fileUri = `${FileSystem.documentDirectory ?? ''}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, csv, {
    encoding: 'utf8',
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: language === 'bn' ? 'EProhori ইতিহাস এক্সপোর্ট' : 'Export EProhori History',
      UTI: 'public.comma-separated-values-text',
    });
    return true;
  }
  return false;
};
