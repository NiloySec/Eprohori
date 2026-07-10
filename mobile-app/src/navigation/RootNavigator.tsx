import React from 'react';
import { NavigationContainer, createNavigationContainerRef, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@theme';
import { useTranslation } from '@hooks';
import { useSettingsStore } from '@stores';
import { ClipboardGuardBanner } from '@components';
import type { RootStackParamList, TabParamList } from './types';

import {
  HomeScreen, AnalyzerScreen, MonitorScreen, HistoryScreen, SettingsScreen,
  ResultScreen, BlocklistScreen, CommunityReportScreen, FamilyScreen,
  OnboardingScreen, LoginScreen, SignupScreen, AdminDashboardScreen,
  CallerIDScreen, SpamDirectoryScreen, CallLogScreen,
  MyReportsScreen, CyberReportScreen, CyberSafetyScreen, FraudAlertsScreen,
  TrustedContactsScreen, ScamNewsScreen,
  LinkCheckScreen, CyberQuizScreen,
  BreachMonitorScreen, LegalSupportScreen
} from '@screens';

type MCIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const ICONS: Record<string, { active: MCIcon; inactive: MCIcon }> = {
  Home:     { active: 'home',    inactive: 'home-outline' },
  Analyzer: { active: 'magnify', inactive: 'magnify' },
  Monitor:  { active: 'map',     inactive: 'map-outline' },
  History:  { active: 'history', inactive: 'history' },
  Settings: { active: 'cog',     inactive: 'cog-outline' },
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab   = createBottomTabNavigator<TabParamList>();

// Shared ref so services (notification taps) can navigate outside components
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Deep links: home widget buttons + notification taps (eprohori://analyze etc.)
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['eprohori://'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Analyzer: 'analyze',
          Monitor:  'monitor',
          History:  'history',
        },
      },
      CallerID:    'callerid',
      FraudAlerts: 'alerts',
      ScamNews:    'scamnews',
    },
  },
};

const TabNavigator = () => {
  const t = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = ICONS[route.name] ?? { active: 'shield', inactive: 'shield-outline' };
          return (
            <MaterialCommunityIcons
              name={focused ? icons.active : icons.inactive}
              size={size}
              color={color}
            />
          );
        },
        tabBarActiveTintColor:   Colors.accent,
        tabBarInactiveTintColor: Colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: Colors.primary,
          borderTopColor:  Colors.secondary,
          borderTopWidth:  1,
          paddingBottom:   5,
          height:          60,
        },
        tabBarLabelStyle: { fontSize: 11, marginTop: 4 },
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen}     options={{ tabBarLabel: t('tab_home') }} />
      <Tab.Screen name="Analyzer" component={AnalyzerScreen} options={{ tabBarLabel: t('tab_analyzer') }} />
      <Tab.Screen name="Monitor"  component={MonitorScreen}  options={{ tabBarLabel: t('tab_monitor') }} />
      <Tab.Screen name="History"  component={HistoryScreen}  options={{ tabBarLabel: t('tab_history') }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: t('tab_settings') }} />
    </Tab.Navigator>
  );
};

export const RootNavigator = () => {
  const hasOnboarded = useSettingsStore((s) => s.hasOnboarded);

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <ClipboardGuardBanner />
      <Stack.Navigator
        initialRouteName={hasOnboarded ? 'MainTabs' : 'Onboarding'}
        screenOptions={{
          headerShown:  false,
          contentStyle: { backgroundColor: Colors.primary },
          animation:    'slide_from_right',
        }}
      >
        <Stack.Screen name="Onboarding"      component={OnboardingScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Login"           component={LoginScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Signup"          component={SignupScreen} />
        <Stack.Screen name="AdminDashboard"  component={AdminDashboardScreen} />
        <Stack.Screen name="MainTabs"        component={TabNavigator} />
        <Stack.Screen name="ResultDetail"    component={ResultScreen} />
        <Stack.Screen name="Blocklist"       component={BlocklistScreen} />
        <Stack.Screen name="CommunityReport" component={CommunityReportScreen} />
        <Stack.Screen name="Family"          component={FamilyScreen} />
        <Stack.Screen name="CallerID"        component={CallerIDScreen} />
        <Stack.Screen name="SpamDirectory"   component={SpamDirectoryScreen} />
        <Stack.Screen name="CallLog"         component={CallLogScreen} />
        <Stack.Screen name="MyReports"       component={MyReportsScreen} />
        <Stack.Screen name="CyberReport"     component={CyberReportScreen} />
        <Stack.Screen name="CyberSafety"     component={CyberSafetyScreen} />
        <Stack.Screen name="FraudAlerts"     component={FraudAlertsScreen} />
        <Stack.Screen name="TrustedContacts" component={TrustedContactsScreen} />
        <Stack.Screen name="ScamNews"        component={ScamNewsScreen} />
        <Stack.Screen name="LinkCheck"       component={LinkCheckScreen} />
        <Stack.Screen name="CyberQuiz"       component={CyberQuizScreen} />
        <Stack.Screen name="BreachMonitor"    component={BreachMonitorScreen} />
        <Stack.Screen name="LegalSupport"     component={LegalSupportScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
