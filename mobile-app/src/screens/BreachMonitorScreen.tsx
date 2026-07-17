import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Shadows } from '@theme';

const BreachMonitorScreen = () => {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const checkBreach = async () => {
    if (!identifier) return;
    setLoading(true);
    try {
      const response = await fetch(`https://eprohori-production.up.railway.app/api/check/breach/${identifier}`);
      const data = await response.json();
      setResult(data);
    } catch (e) {
      Alert.alert('', 'চেক করা সম্ভব হয়নি');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>ডাটা লিক মনিটর</Text>
        <Text style={styles.sub}>আপনার ইমেইল বা ফোন নম্বর কি ডার্ক ওয়েবে লিক হয়েছে?</Text>

        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            placeholder="ইমেইল বা ফোন নম্বর লিখুন"
            placeholderTextColor="#666"
            value={identifier}
            onChangeText={setIdentifier}
          />
          <TouchableOpacity style={styles.btn} onPress={checkBreach} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>চেক করুন</Text>}
          </TouchableOpacity>
        </View>

        {result && (
          <View style={[styles.resCard, result.is_pwned ? styles.resDanger : styles.resSafe]}>
            <Icon name={result.is_pwned ? 'alert-octagon' : 'check-circle'} size={48} color={result.is_pwned ? '#ef4444' : '#10b981'} />
            <Text style={styles.resTitle}>{result.is_pwned ? 'আপনার তথ্য লিক হয়েছে!' : 'আপনার তথ্য নিরাপদ আছে'}</Text>
            {result.is_pwned && (
              <>
                <Text style={styles.resCount}>{result.breach_count}টি ব্রীচে আপনার তথ্য পাওয়া গেছে</Text>
                {result.sources.map((s: any, i: number) => (
                  <View key={i} style={styles.sourceItem}>
                    <Text style={styles.sourceName}>{s.name} ({s.date})</Text>
                    <Text style={styles.sourceData}>লিক হওয়া ডাটা: {s.data}</Text>
                  </View>
                ))}
                <Text style={styles.rec}>{result.recommendation}</Text>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#050810' },
  scroll: { padding: 24 },
  title: { fontSize: 24, fontWeight: '900', color: '#fff' },
  sub: { fontSize: 14, color: '#94a3b8', marginTop: 8, marginBottom: 30 },
  inputCard: { backgroundColor: '#0d1321', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#1e293b' },
  input: { height: 50, color: '#fff', fontSize: 16, borderBottomWidth: 1, borderBottomColor: '#334155', marginBottom: 15 },
  btn: { backgroundColor: Colors.accent, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#000', fontWeight: '800', fontSize: 16 },
  resCard: { marginTop: 30, padding: 20, borderRadius: 24, alignItems: 'center', borderWidth: 1 },
  resDanger: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' },
  resSafe: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' },
  resTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 15 },
  resCount: { fontSize: 14, color: '#ef4444', marginTop: 5, marginBottom: 20 },
  sourceItem: { width: '100%', padding: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, marginBottom: 10 },
  sourceName: { color: '#fff', fontWeight: '700', fontSize: 13 },
  sourceData: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  rec: { color: '#fff', fontSize: 13, textAlign: 'center', marginTop: 15, fontWeight: '600' }
});

export default BreachMonitorScreen;
