import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, TextStyles, Spacing, BorderRadius } from '@theme';
import { useAuthStore } from '@stores';
import { threatAnalysisAPI } from '@api';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requires2fa, setRequires2fa] = useState(false);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('ত্রুটি', 'ইমেইল এবং পাসওয়ার্ড দিন');
      return;
    }
    setLoading(true);
    try {
      const res = await threatAnalysisAPI.login(email, password, totpCode);
      if (res.requires_2fa) {
        setRequires2fa(true);
        Alert.alert('২-ফ্যাক্টর যাচাইকরণ', 'আপনার অথেন্টিকেটর অ্যাপ থেকে কোডটি দিন');
        setLoading(false);
        return;
      }

      if (!res.token) {
        Alert.alert('ত্রুটি', 'সিস্টেম টোকেন পাওয়া যায়নি');
        setLoading(false);
        return;
      }

      setAuth({
        id: res.id,
        name: res.name,
        email: res.email,
        is_admin: res.is_admin,
        xp: res.xp,
        badge: res.badge,
        reports: res.reports
      }, res.token);
      navigation.replace('MainTabs');
    } catch (err: any) {
      Alert.alert('ব্যর্থ হয়েছে', err.message || 'লগইন করা সম্ভব হয়নি');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={Colors.gradient.hero} style={styles.hero}>
        <Icon name="shield-lock" size={80} color={Colors.accent} />
        <Text style={styles.title}>স্বাগতম</Text>
        <Text style={styles.subtitle}>EProhori অ্যাকাউন্টে লগইন করুন</Text>
      </LinearGradient>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>ইমেইল</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="example@mail.com"
            placeholderTextColor={Colors.text.tertiary}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>পাসওয়ার্ড</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="********"
            placeholderTextColor={Colors.text.tertiary}
            secureTextEntry
          />
        </View>

        {requires2fa && (
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: Colors.accent }]}>২-ফ্যাক্টর কোড (TOTP)</Text>
            <TextInput
              style={[styles.input, { borderColor: Colors.accent }]}
              value={totpCode}
              onChangeText={setTotpCode}
              placeholder="123456"
              placeholderTextColor={Colors.text.tertiary}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>
        )}

        <TouchableOpacity
          style={styles.loginBtn}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <Text style={styles.loginBtnText}>লগইন করুন</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signupLink}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={styles.signupLinkText}>অ্যাকাউন্ট নেই? রেজিস্ট্রেশন করুন</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => navigation.replace('MainTabs')}
        >
          <Text style={styles.skipBtnText}>পরে করুন</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  hero: { padding: 40, alignItems: 'center', gap: 10 },
  title: { ...TextStyles.h1, color: Colors.accent },
  subtitle: { ...TextStyles.body, color: Colors.text.secondary },
  form: { padding: Spacing.xl, gap: 20 },
  inputGroup: { gap: 8 },
  label: { ...TextStyles.caption, color: Colors.text.primary, fontWeight: '700' },
  input: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.md,
    padding: 15,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loginBtn: {
    backgroundColor: Colors.accent,
    padding: 18,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: 10,
  },
  loginBtnText: { ...TextStyles.button, color: Colors.primary },
  signupLink: { alignItems: 'center' },
  signupLinkText: { color: Colors.accent, fontSize: 14 },
  skipBtn: { alignItems: 'center', marginTop: 10 },
  skipBtnText: { color: Colors.text.tertiary, fontSize: 13 },
});
