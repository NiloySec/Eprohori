import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useThemeColors, DarkColors, type ThemeColors, TextStyles, Spacing, BorderRadius } from '@theme';
import { useTranslation } from '@hooks';

let Colors: ThemeColors = DarkColors;
let styles: ReturnType<typeof makeStyles>;
import { useAuthStore } from '@stores';
import { threatAnalysisAPI } from '@api';

export default function LoginScreen({ navigation }: any) {
  Colors = useThemeColors();
  styles = React.useMemo(() => makeStyles(Colors), [Colors]);
  const t = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requires2fa, setRequires2fa] = useState(false);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('login_err_title'), t('login_err_required'));
      return;
    }
    setLoading(true);
    try {
      const res = await threatAnalysisAPI.login(email, password, totpCode);
      if (res.requires_2fa) {
        setRequires2fa(true);
        Alert.alert(t('login_2fa_title'), t('login_2fa_msg'));
        setLoading(false);
        return;
      }

      if (!res.token) {
        Alert.alert(t('login_err_title'), t('login_no_token'));
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
      Alert.alert(t('login_failed_title'), err.message || t('login_failed_msg'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={Colors.gradient.hero} style={styles.hero}>
        <Icon name="shield-lock" size={80} color={Colors.accent} />
        <Text style={styles.title}>{t('login_welcome')}</Text>
        <Text style={styles.subtitle}>{t('login_subtitle')}</Text>
      </LinearGradient>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('login_email_label')}</Text>
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
          <Text style={styles.label}>{t('login_password_label')}</Text>
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
            <Text style={[styles.label, { color: Colors.accent }]}>{t('login_2fa_label')}</Text>
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
            <Text style={styles.loginBtnText}>{t('login_btn')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signupLink}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={styles.signupLinkText}>{t('login_no_account')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => navigation.replace('MainTabs')}
        >
          <Text style={styles.skipBtnText}>{t('login_skip')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
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
styles = makeStyles(Colors);
