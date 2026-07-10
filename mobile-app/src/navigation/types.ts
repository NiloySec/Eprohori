import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Onboarding:      undefined;
  MainTabs:        NavigatorScreenParams<TabParamList> | undefined;
  ResultDetail:    undefined;
  Blocklist:       undefined;
  CommunityReport: undefined;
  Family:          undefined;
  CallerID:        { initialNumber?: string } | undefined;
  SMSScan:         undefined;
  SpamDirectory:   undefined;
  CallLog:         undefined;
  MyReports:       undefined;
  CyberReport:     undefined;
  CyberSafety:     undefined;
  FraudAlerts:     undefined;
  InboxScan:       undefined;
  QRScan:          undefined;
  TrustedContacts: undefined;
  ScamNews:        undefined;
  FakeAppScan:     undefined;
  CallScriptCheck: undefined;
  LinkCheck:       { url: string };
  CyberQuiz:       undefined;
  LiveCallListen:   undefined;
  BreachMonitor:    undefined;
  LegalSupport:     undefined;
};

export type TabParamList = {
  Home:     undefined;
  Analyzer: undefined;
  Monitor:  undefined;
  History:  undefined;
  Settings: undefined;
};

// Stack screen props
export type OnboardingScreenProps    = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;
export type ResultDetailScreenProps  = NativeStackScreenProps<RootStackParamList, 'ResultDetail'>;
export type BlocklistScreenProps     = NativeStackScreenProps<RootStackParamList, 'Blocklist'>;
export type CommunityReportScreenProps = NativeStackScreenProps<RootStackParamList, 'CommunityReport'>;
export type FamilyScreenProps        = NativeStackScreenProps<RootStackParamList, 'Family'>;
export type CallerIDScreenProps      = NativeStackScreenProps<RootStackParamList, 'CallerID'>;
export type SMSScanScreenProps       = NativeStackScreenProps<RootStackParamList, 'SMSScan'>;
export type SpamDirectoryScreenProps = NativeStackScreenProps<RootStackParamList, 'SpamDirectory'>;
export type CallLogScreenProps       = NativeStackScreenProps<RootStackParamList, 'CallLog'>;
export type MyReportsScreenProps     = NativeStackScreenProps<RootStackParamList, 'MyReports'>;
export type CyberSafetyScreenProps   = NativeStackScreenProps<RootStackParamList, 'CyberSafety'>;
export type FraudAlertsScreenProps   = NativeStackScreenProps<RootStackParamList, 'FraudAlerts'>;
export type InboxScanScreenProps     = NativeStackScreenProps<RootStackParamList, 'InboxScan'>;
export type QRScanScreenProps        = NativeStackScreenProps<RootStackParamList, 'QRScan'>;
export type TrustedContactsScreenProps = NativeStackScreenProps<RootStackParamList, 'TrustedContacts'>;
export type ScamNewsScreenProps      = NativeStackScreenProps<RootStackParamList, 'ScamNews'>;
export type FakeAppScanScreenProps   = NativeStackScreenProps<RootStackParamList, 'FakeAppScan'>;
export type CallScriptCheckScreenProps = NativeStackScreenProps<RootStackParamList, 'CallScriptCheck'>;
export type LinkCheckScreenProps       = NativeStackScreenProps<RootStackParamList, 'LinkCheck'>;
export type CyberQuizScreenProps       = NativeStackScreenProps<RootStackParamList, 'CyberQuiz'>;

// Tab screen props (can also navigate the root stack)
export type HomeScreenProps     = CompositeScreenProps<BottomTabScreenProps<TabParamList, 'Home'>,     NativeStackScreenProps<RootStackParamList>>;
export type AnalyzerScreenProps = CompositeScreenProps<BottomTabScreenProps<TabParamList, 'Analyzer'>, NativeStackScreenProps<RootStackParamList>>;
export type MonitorScreenProps  = CompositeScreenProps<BottomTabScreenProps<TabParamList, 'Monitor'>,  NativeStackScreenProps<RootStackParamList>>;
export type HistoryScreenProps  = CompositeScreenProps<BottomTabScreenProps<TabParamList, 'History'>,  NativeStackScreenProps<RootStackParamList>>;
export type SettingsScreenProps = CompositeScreenProps<BottomTabScreenProps<TabParamList, 'Settings'>, NativeStackScreenProps<RootStackParamList>>;
