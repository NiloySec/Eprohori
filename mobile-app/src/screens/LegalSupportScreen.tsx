import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useThemeColors, DarkColors, type ThemeColors } from '@theme';

let Colors: ThemeColors = DarkColors;
let styles: ReturnType<typeof makeStyles>;

const LegalSupportScreen = () => {
  Colors = useThemeColors();
  styles = React.useMemo(() => makeStyles(Colors), [Colors]);
  const contacts = [
    { title: 'BTRC সাইবার ক্রাইম', sub: 'বিটিআরসি কল সেন্টার', val: '100', icon: 'phone' },
    { title: 'পুলিশ সাইবার সাপোর্ট', sub: 'ফেসবুক পেজ', val: 'https://www.facebook.com/CyberSupportPolice', icon: 'facebook' },
    { title: 'CID সাইবার পুলিশ', sub: 'ইমেইল হেল্পডেস্ক', val: 'cyber@police.gov.bd', icon: 'email' },
    { title: 'জাতীয় হেল্পলাইন', sub: 'জরুরি সেবা', val: '999', icon: 'shield-star' },
  ];

  const handleAction = (val: string) => {
    if (val.startsWith('http')) Linking.openURL(val);
    else if (val.includes('@')) Linking.openURL(`mailto:${val}`);
    else Linking.openURL(`tel:${val}`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>আইনি সহায়তা কেন্দ্র</Text>
        <Text style={styles.sub}>প্রতারিত হলে ঘাবড়াবেন না। নিচে দেওয়া আইনি মাধ্যমগুলোতে যোগাযোগ করুন।</Text>

        <View style={styles.vaultCard}>
           <Icon name="file-pdf-box" size={40} color="#ef4444" />
           <View style={styles.vaultTexts}>
             <Text style={styles.vaultTitle}>ডিজিটাল এভিডেন্স ভল্ট</Text>
             <Text style={styles.vaultSub}>আপনার প্রতারণার প্রমাণগুলো PDF আকারে ডাউনলোড করুন পুলিশকে দেখানোর জন্য।</Text>
           </View>
           <TouchableOpacity style={styles.vaultBtn}>
              <Icon name="download" size={24} color={Colors.accent} />
           </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>গুরুত্বপূর্ণ কন্টাক্টস</Text>
        {contacts.map((c, i) => (
          <TouchableOpacity key={i} style={styles.contactItem} onPress={() => handleAction(c.val)}>
            <View style={styles.iconBox}><Icon name={c.icon as any} size={24} color={Colors.accent} /></View>
            <View style={{flex: 1}}>
              <Text style={styles.cTitle}>{c.title}</Text>
              <Text style={styles.cSub}>{c.sub}: {c.val}</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#334155" />
          </TouchableOpacity>
        ))}

        <View style={styles.guideCard}>
           <Text style={styles.guideTitle}>করনীয় ধাপসমূহ:</Text>
           <Text style={styles.guideText}>১. আপনার সব স্ক্রিনশট ও ট্রানজ্যাকশন আইডি সেভ করুন।</Text>
           <Text style={styles.guideText}>২. স্থানীয় থানায় একটি GD (General Diary) করুন।</Text>
           <Text style={styles.guideText}>৩. 999 বা 100 নম্বরে কল করে ঘটনাটি জানান।</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  scroll: { padding: 24 },
  title: { fontSize: 24, fontWeight: '900', color: Colors.text.primary },
  sub: { fontSize: 14, color: Colors.text.secondary, marginTop: 8, marginBottom: 30 },
  vaultCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.secondary, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 30 },
  vaultTexts: { flex: 1, marginLeft: 15, marginRight: 10 },
  vaultTitle: { color: Colors.text.primary, fontWeight: '800', fontSize: 16 },
  vaultSub: { color: Colors.text.secondary, fontSize: 12, marginTop: 4 },
  vaultBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(0, 255, 204, 0.05)', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.text.primary, marginBottom: 15 },
  contactItem: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: Colors.secondary, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(0, 255, 204, 0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  cTitle: { color: Colors.text.primary, fontWeight: '700', fontSize: 15 },
  cSub: { color: Colors.text.secondary, fontSize: 12, marginTop: 2 },
  guideCard: { marginTop: 20, padding: 20, backgroundColor: 'rgba(0, 255, 204, 0.03)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(0, 255, 204, 0.1)' },
  guideTitle: { color: Colors.accent, fontWeight: '800', fontSize: 16, marginBottom: 10 },
  guideText: { color: Colors.text.secondary, fontSize: 13, marginBottom: 8, lineHeight: 20 }
});

export default LegalSupportScreen;
styles = makeStyles(Colors);
