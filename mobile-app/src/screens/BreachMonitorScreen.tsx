import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors, DarkColors, type ThemeColors, Shadows } from '@theme';
import { useTranslation } from '@hooks';

let Colors: ThemeColors = DarkColors;
let styles: ReturnType<typeof makeStyles>;

const BreachMonitorScreen = () => {
  Colors = useThemeColors();
  styles = React.useMemo(() => makeStyles(Colors), [Colors]);
  const t = useTranslation();
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
      Alert.alert('', t('breach_check_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{t('breach_title')}</Text>
        <Text style={styles.sub}>{t('breach_sub')}</Text>

        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            placeholder={t('breach_placeholder')}
            placeholderTextColor="#666"
            value={identifier}
            onChangeText={setIdentifier}
          />
          <TouchableOpacity style={styles.btn} onPress={checkBreach} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t('breach_check_btn')}</Text>}
          </TouchableOpacity>
        </View>

        {result && (
          <View style={[styles.resCard, result.is_pwned ? styles.resDanger : styles.resSafe]}>
            <Icon name={result.is_pwned ? 'alert-octagon' : 'check-circle'} size={48} color={result.is_pwned ? '#ef4444' : '#10b981'} />
            <Text style={styles.resTitle}>{result.is_pwned ? t('breach_pwned') : t('breach_safe')}</Text>
            {result.is_pwned && (
              <>
                <Text style={styles.resCount}>{result.breach_count} {t('breach_count_suffix')}</Text>
                {result.sources.map((s: any, i: number) => (
                  <View key={i} style={styles.sourceItem}>
                    <Text style={styles.sourceName}>{s.name} ({s.date})</Text>
                    <Text style={styles.sourceData}>{t('breach_leaked_data')}: {s.data}</Text>
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

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  scroll: { padding: 24 },
  title: { fontSize: 24, fontWeight: '900', color: Colors.text.primary },
  sub: { fontSize: 14, color: Colors.text.secondary, marginTop: 8, marginBottom: 30 },
  inputCard: { backgroundColor: Colors.secondary, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  input: { height: 50, color: Colors.text.primary, fontSize: 16, borderBottomWidth: 1, borderBottomColor: '#334155', marginBottom: 15 },
  btn: { backgroundColor: Colors.accent, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#000', fontWeight: '800', fontSize: 16 },
  resCard: { marginTop: 30, padding: 20, borderRadius: 24, alignItems: 'center', borderWidth: 1 },
  resDanger: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' },
  resSafe: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' },
  resTitle: { fontSize: 20, fontWeight: '800', color: Colors.text.primary, marginTop: 15 },
  resCount: { fontSize: 14, color: '#ef4444', marginTop: 5, marginBottom: 20 },
  sourceItem: { width: '100%', padding: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, marginBottom: 10 },
  sourceName: { color: Colors.text.primary, fontWeight: '700', fontSize: 13 },
  sourceData: { color: Colors.text.secondary, fontSize: 11, marginTop: 2 },
  rec: { color: Colors.text.primary, fontSize: 13, textAlign: 'center', marginTop: 15, fontWeight: '600' }
});

export default BreachMonitorScreen;
styles = makeStyles(Colors);
