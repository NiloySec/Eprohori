import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useThemeColors, DarkColors, type ThemeColors, TextStyles, Spacing, BorderRadius } from '@theme';

let Colors: ThemeColors = DarkColors;
let styles: ReturnType<typeof makeStyles>;
import { threatAnalysisAPI } from '@api';

export default function AdminDashboardScreen({ navigation }: any) {
  Colors = useThemeColors();
  styles = React.useMemo(() => makeStyles(Colors), [Colors]);
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [minConf, setMinConf] = useState<number | null>(null);

  const loadPending = async (conf?: number | null) => {
    try {
      const data = await threatAnalysisAPI.fetchPendingThreats(conf);
      setPending(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPending(minConf);
  }, [minConf]);

  const handleAction = async (id: number, action: 'verify' | 'reject') => {
    try {
      if (action === 'verify') {
        await threatAnalysisAPI.verifyThreat(id);
      } else {
        await threatAnalysisAPI.rejectThreat(id);
      }
      setPending(prev => prev.filter(item => item.id !== id));
      Alert.alert('সফল', action === 'verify' ? 'থ্রেটটি অনুমোদিত হয়েছে' : 'থ্রেটটি বাতিল করা হয়েছে');
    } catch (err) {
      Alert.alert('ব্যর্থ', 'অ্যাকশন সম্পন্ন করা যায়নি');
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardType}>{item.type.toUpperCase()}</Text>
        <Text style={styles.cardConf}>{Math.round(item.confidence * 100)}% Match</Text>
      </View>
      <Text style={styles.cardContent} numberOfLines={3}>{item.content}</Text>
      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.rejectBtn]}
          onPress={() => handleAction(item.id, 'reject')}
        >
          <Icon name="close" size={20} color="#fff" />
          <Text style={styles.actionBtnText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.verifyBtn]}
          onPress={() => handleAction(item.id, 'verify')}
        >
          <Icon name="check" size={20} color="#fff" />
          <Text style={styles.actionBtnText}>Verify</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>অ্যাডমিন ড্যাশবোর্ড</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* M24: Admin Filtering Chips */}
      <View style={styles.filterRow}>
        {[
          { label: 'All', val: null },
          { label: 'High (80%+)', val: 0.8 },
          { label: 'Med (50%+)', val: 0.5 }
        ].map(f => (
          <TouchableOpacity
            key={f.label}
            style={[styles.filterChip, minConf === f.val && styles.filterChipActive]}
            onPress={() => setMinConf(f.val)}
          >
            <Text style={[styles.filterText, minConf === f.val && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={Colors.accent} size="large" />
      ) : (
        <FlatList
          data={pending}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPending(); }} tintColor={Colors.accent} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="shield-check" size={60} color={Colors.text.tertiary} />
              <Text style={styles.emptyText}>কোনো পেন্ডিং রিপোর্ট নেই</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { ...TextStyles.h3, color: Colors.text.primary },
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingBottom: 10, gap: 10 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.secondary, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterText: { fontSize: 12, color: Colors.text.secondary },
  filterTextActive: { color: Colors.primary, fontWeight: 'bold' },
  list: { padding: Spacing.lg, gap: 15 },
  card: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cardType: { color: Colors.accent, fontWeight: 'bold', fontSize: 12 },
  cardConf: { color: Colors.text.tertiary, fontSize: 12 },
  cardContent: { ...TextStyles.body, color: Colors.text.primary, marginBottom: 15 },
  cardFooter: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: BorderRadius.sm,
    gap: 5
  },
  verifyBtn: { backgroundColor: '#10b981' },
  rejectBtn: { backgroundColor: '#ef4444' },
  actionBtnText: { color: Colors.text.primary, fontWeight: 'bold', fontSize: 14 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 10 },
  emptyText: { color: Colors.text.tertiary, fontSize: 16 },
});
styles = makeStyles(Colors);
