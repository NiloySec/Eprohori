import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useThemeColors, DarkColors, type ThemeColors, TextStyles, Spacing } from '@theme';

let Colors: ThemeColors = DarkColors;
let styles: ReturnType<typeof makeStyles>;
import { useTranslation } from '@hooks';

const API_BASE = 'https://eprohori-production.up.railway.app';
const MIN_INTERVAL = 30_000;
const MAX_INTERVAL = 300_000;

type ConnStatus = 'online' | 'offline' | 'connecting';

export const OfflineBanner = () => {
  Colors = useThemeColors();
  styles = React.useMemo(() => makeStyles(Colors), [Colors]);
  const [status, setStatus] = useState<ConnStatus>('online');
  const intervalRef = useRef(MIN_INTERVAL);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const t = useTranslation();

  useEffect(() => {
    mountedRef.current = true;

    const check = async () => {
      // L6: transition to 'connecting' when recovering from offline
      if (mountedRef.current) setStatus((s) => (s === 'offline' ? 'connecting' : s));
      try {
        const controller = new AbortController();
        const abort = setTimeout(() => controller.abort(), 5000);
        await fetch(`${API_BASE}/health`, { method: 'HEAD', signal: controller.signal });
        clearTimeout(abort);
        if (!mountedRef.current) return;
        setStatus('online');
        intervalRef.current = MIN_INTERVAL;
      } catch {
        if (!mountedRef.current) return;
        setStatus('offline');
        intervalRef.current = Math.min(intervalRef.current * 2, MAX_INTERVAL);
      }
      schedule();
    };

    const schedule = () => {
      timerRef.current = setTimeout(check, intervalRef.current);
    };

    check();
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (status === 'online') return null;

  const isConnecting = status === 'connecting';
  return (
    <View style={[styles.banner, isConnecting && styles.bannerConnecting]}>
      <Icon name={isConnecting ? 'wifi' : 'wifi-off'} size={15} color={Colors.white} />
      <Text style={styles.text}>
        {isConnecting ? t('offline_connecting') : t('offline_banner')}
      </Text>
    </View>
  );
};

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  banner: {
    backgroundColor: Colors.suspicious,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: Spacing.lg,
  },
  bannerConnecting: { backgroundColor: Colors.accentDark }, // L6: green tint while reconnecting
  text: { ...TextStyles.caption, color: Colors.white, fontWeight: '700' },
});
styles = makeStyles(Colors);
