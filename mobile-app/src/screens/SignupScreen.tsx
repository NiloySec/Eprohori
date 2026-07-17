import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView,
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

export default function SignupScreen({ navigation }: any) {
  Colors = useThemeColors();
  styles = React.useMemo(() => makeStyles(Colors), [Colors]);
  const t = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [division, setDivision] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSignup = async () => {
    if (!name || !email || !password) {
      Alert.alert(t('signup_err_title'), t('signup_err_required'));
      return;
    }
    setLoading(true);
    try {
      const res = await threatAnalysisAPI.register({ name, email, password, phone, division });
      if (!res.token) {
        Alert.alert(t('signup_err_title'), t('signup_no_token'));
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
      Alert.alert(t('signup_failed_title'), err.message || t('signup_failed_msg'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={Colors.gradient.hero} style={styles.hero}>
          <Icon name="account-plus" size={60} color={Colors.accent} />
          <Text style={styles.title}>{t('signup_title')}</Text>
          <Text style={styles.subtitle}>{t('signup_subtitle')}</Text>
        </LinearGradient>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('signup_name_label')}</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t('signup_name_placeholder')} placeholderTextColor={Colors.text.tertiary} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('signup_email_label')}</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="example@mail.com" placeholderTextColor={Colors.text.tertiary} keyboardType="email-address" autoCapitalize="none" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('signup_phone_label')}</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="017XXXXXXXX" placeholderTextColor={Colors.text.tertiary} keyboardType="phone-pad" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('signup_password_label')}</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="********" placeholderTextColor={Colors.text.tertiary} secureTextEntry />
          </View>

          <TouchableOpacity style={styles.signupBtn} onPress={handleSignup} disabled={loading}>
            {loading ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.signupBtnText}>{t('signup_btn')}</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLinkText}>{t('signup_has_account')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  hero: { padding: 30, alignItems: 'center', gap: 10 },
  title: { ...TextStyles.h2, color: Colors.accent },
  subtitle: { ...TextStyles.body, color: Colors.text.secondary },
  form: { padding: Spacing.xl, gap: 15 },
  inputGroup: { gap: 6 },
  label: { ...TextStyles.caption, color: Colors.text.primary, fontWeight: '700' },
  input: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.md,
    padding: 12,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  signupBtn: {
    backgroundColor: Colors.accent,
    padding: 16,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: 10,
  },
  signupBtnText: { ...TextStyles.button, color: Colors.primary },
  loginLink: { alignItems: 'center', marginBottom: 20 },
  loginLinkText: { color: Colors.accent, fontSize: 14 },
});
styles = makeStyles(Colors);
