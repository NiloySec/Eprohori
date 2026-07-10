import axios, { AxiosInstance, AxiosError } from 'axios';
import { analyzeUrlLocally, type UrlFeatures } from '../utils/urlFeatures';
import { categorizeSms } from '../utils/smsCategories';
import { useAuthStore } from '../stores/authStore';

// C5: Hardcoded config — never use process.env in mobile bundle (baked into APK)
const API_BASE_URL = 'https://eprohori-production.up.railway.app';
const API_TIMEOUT  = 30000;
const APP_SECRET   = 'eprohori-internal-2025'; // M16: shared secret for bulk API integrity

// C2: Runtime type guard for API response
function validateApiThreatResponse(data: unknown): ValidateTextResponse {
  if (typeof data !== 'object' || data === null) throw new Error('Invalid response shape');
  const d = data as Record<string, unknown>;
  if (typeof d.is_threat !== 'boolean') throw new Error('is_threat not boolean');
  if (typeof d.confidence !== 'number' || d.confidence < 0 || d.confidence > 1)
    throw new Error('confidence out of range');
  const VALID_CATS = ['phishing', 'scam', 'fraud', 'malware', 'safe', ''];
  if (typeof d.category === 'string' && !VALID_CATS.includes((d.category as string).toLowerCase()))
    d.category = 'scam'; // coerce unknown category rather than reject
  return d as unknown as ValidateTextResponse;
}

export interface ThreatAnalysisResponse {
  threat_type: 'phishing' | 'scam' | 'fraud' | 'malware' | 'safe';
  confidence: number;
  message: string;
  solution_steps: string[];
  prevention_tips: string[];
  domain_age_days?: number | null;   // from backend WHOIS
  url_features?: UrlFeatures;        // local analysis (subdomain, SSL, IP)
}

interface ValidateTextResponse {
  is_threat: boolean;
  confidence: number;
  category: string;
  reasons: string[];
  explanation: string | null;
  source: string;
  real_domain: string | null;
  domain_age_days: number | null;
}

export interface UserAuthResponse {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  xp: number;
  badge: string;
  reports: number;
  token: string;
}

const SOLUTION_STEPS: Record<'bn' | 'en', Record<string, string[]>> = {
  bn: {
    phishing: [
      '⚠️ এই মেসেজের কোনো লিংকে ক্লিক করবেন না',
      '🔒 কখনো OTP, পাসওয়ার্ড বা ব্যক্তিগত তথ্য শেয়ার করবেন না',
      '📞 সরাসরি প্রতিষ্ঠানের অফিসিয়াল নম্বরে যোগাযোগ করুন',
      '🚫 সন্দেহজনক নম্বর বা পরিচিতি ব্লক করুন',
    ],
    scam: [
      '💰 কোনো টাকা পাঠাবেন না বা ব্যক্তিগত তথ্য দেবেন না',
      '🎁 অবিশ্বাস্য অফার বা পুরস্কারের দাবি প্রতারণার লক্ষণ',
      '📢 পরিবার ও বন্ধুদের সতর্ক করুন',
      '🚫 এই নম্বর ব্লক করুন',
    ],
    fraud: [
      '🛑 যেকোনো লেনদেন বন্ধ করুন',
      '🏦 আপনার ব্যাংক বা মোবাইল ব্যাংকিং সেবাকে জানান',
      '👮 স্থানীয় থানায় রিপোর্ট করুন',
      '📱 EProhori-এ কমিউনিটি রিপোর্ট করুন',
    ],
    malware: [
      '📵 এই লিংক থেকে কোনো অ্যাপ ডাউনলোড করবেন না',
      '🔄 শুধু Google Play বা App Store থেকে অ্যাপ ইনস্টল করুন',
      '🔒 ফোনের নিরাপত্তা স্ক্যান করুন',
    ],
    safe: [],
  },
  en: {
    phishing: [
      '⚠️ Do not click any links in this message',
      '🔒 Never share OTP, passwords, or personal information',
      '📞 Contact the organization directly via official channels',
      '🚫 Block this suspicious number or contact',
    ],
    scam: [
      '💰 Do not send money or share personal details',
      '🎁 Unbelievable offers or prize claims are signs of scams',
      '📢 Warn your family and friends',
      '🚫 Block this number',
    ],
    fraud: [
      '🛑 Stop any transactions immediately',
      '🏦 Inform your bank or mobile banking service',
      '👮 Report to local police',
      '📱 File a community report on EProhori',
    ],
    malware: [
      '📵 Do not download any apps from this link',
      '🔄 Only install apps from Google Play or App Store',
      '🔒 Run a security scan on your phone',
    ],
    safe: [],
  },
};

const PREVENTION_TIPS: Record<'bn' | 'en', Record<string, string[]>> = {
  bn: {
    phishing: [
      '✅ সবসময় অফিসিয়াল ওয়েবসাইট বা অ্যাপ ব্যবহার করুন',
      '🔐 Two-factor authentication চালু করুন',
      '📱 EProhori দিয়ে নিয়মিত সন্দেহজনক মেসেজ যাচাই করুন',
    ],
    scam: [
      '🎁 "বিনামূল্যে পুরস্কার" দাবিকারী মেসেজ সবসময় সন্দেহ করুন',
      '👨‍👩‍👧 পরিবারের সবাইকে সাইবার নিরাপত্তা সম্পর্কে শেখান',
      '📱 EProhori অ্যাপে রিপোর্ট করুন',
    ],
    fraud: [
      '🏦 অফিসিয়াল হেল্পলাইনের মাধ্যমে ব্যাংকে যোগাযোগ করুন',
      '📋 অজানা নম্বর থেকে আসা আর্থিক প্রস্তাব প্রত্যাখ্যান করুন',
    ],
    malware: [
      '🔄 ফোনের অপারেটিং সিস্টেম সবসময় আপডেট রাখুন',
      '🛡️ বিশ্বস্ত অ্যান্টিভাইরাস ব্যবহার করুন',
    ],
    safe: [],
  },
  en: {
    phishing: [
      '✅ Always use official websites or apps',
      '🔐 Enable two-factor authentication',
      '📱 Regularly verify suspicious messages with EProhori',
    ],
    scam: [
      '🎁 Always be skeptical of messages claiming free prizes',
      '👨‍👩‍👧 Educate your family about cyber security',
      '📱 Report scams on EProhori',
    ],
    fraud: [
      '🏦 Contact your bank through the official helpline',
      '📋 Reject any financial proposals from unknown numbers',
    ],
    malware: [
      '🔄 Keep your phone\'s operating system up to date',
      '🛡️ Use a trusted antivirus app',
    ],
    safe: [],
  },
};

export interface CommunityReportRequest {
  content: string;
  platform: 'SMS' | 'WhatsApp' | 'Telegram' | 'Email' | 'Call' | 'Other';
  threat_type: 'phishing' | 'scam' | 'fraud' | 'spam' | 'other';
  district?: string;
  reporter_type: 'mobile';
}

export interface CommunitySpamEntry {
  number:    string;
  category:  string;
  count:     number;
  note?:     string;
}

export interface FraudAlertItem {
  id: string;
  date: string;
  category: string;
  categoryColor: string;
  categoryIcon: string;
  title: string;
  body: string;
  tags: string[];
  severity: 'critical' | 'high' | 'medium';
}

export interface DistrictStat {
  name: string;
  name_bn?: string;
  threats: number;
  lat?: number;
  lng?: number;
  color?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

class ThreatAnalysisAPI {
  private axiosInstance: AxiosInstance;
  // H3: in-flight lock prevents simultaneous fetchFraudAlerts() from racing on AsyncStorage
  private _fraudAlertsFetch: Promise<{ alerts: FraudAlertItem[]; fromCache: boolean; lastUpdated: number | null }> | null = null;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'EProhori-Mobile/1.x', // M7: no exact version to reduce fingerprinting
      },
    });

    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        console.log('[API]', config.method?.toUpperCase(), config.url);
        return config;
      },
      (error) => Promise.reject(error)
    );
    this.axiosInstance.interceptors.response.use(
      (response) => { console.log('[API] ←', response.status); return response; },
      (error) => Promise.reject(error)
    );
  }

  // Build a ThreatAnalysisResponse entirely from local pattern matching (no network)
  localAnalysisFallback(text: string, lang: 'bn' | 'en'): ThreatAnalysisResponse {
    const cat = categorizeSms(text);
    const isUrl = /^https?:\/\//i.test(text.trim());
    const urlFeatures = isUrl ? analyzeUrlLocally(text) : undefined;

    const threatCats = new Set(['otp_theft', 'mfs_fraud', 'fraud', 'phishing', 'malware']);
    const isThreat = threatCats.has(cat.category);
    const threatType: ThreatAnalysisResponse['threat_type'] = !isThreat ? 'safe'
      : cat.category === 'phishing' ? 'phishing'
      : cat.category === 'malware'  ? 'malware'
      : 'fraud';

    const conf = isThreat ? Math.round(cat.confidence * 80 + 15) : Math.round((1 - cat.confidence) * 50);
    const steps = SOLUTION_STEPS[lang];
    const tips  = PREVENTION_TIPS[lang];
    return {
      threat_type:     threatType,
      confidence:      conf,
      message:         isThreat ? `স্থানীয় বিশ্লেষণ: ${cat.label_bn} সনাক্ত (অফলাইন মোড)` : '',
      solution_steps:  steps[threatType] ?? [],
      prevention_tips: tips[threatType]  ?? [],
      url_features:    urlFeatures,
    };
  }

  async analyzeThreat(
    message: string,
    language: 'bn' | 'en' = 'bn',
    retries = 3,
    privacyMode = false,
  ): Promise<ThreatAnalysisResponse> {
    const isUrl = /^https?:\/\//i.test(message.trim());
    const payload = { text: message, type: isUrl ? 'url' : 'sms' };
    const lang = language === 'en' ? 'en' : 'bn';

    // Run local URL analysis immediately (no API needed)
    const urlFeatures = isUrl ? analyzeUrlLocally(message) : undefined;

    // Privacy mode: skip all external calls, use local analysis only
    if (privacyMode) return this.localAnalysisFallback(message, lang);

    // H5: skip API entirely when device has no connectivity
    try {
      const NetInfo = (await import('@react-native-community/netinfo')).default;
      const net = await NetInfo.fetch();
      if (!net.isConnected) return this.localAnalysisFallback(message, lang);
    } catch {} // NetInfo not available — proceed normally

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await this.axiosInstance.post<unknown>(
          '/api/validate/text',
          payload
        );
        // C2: validate API response shape + value ranges before using
        const data = validateApiThreatResponse(response.data);

        const VALID_TYPES = ['phishing', 'scam', 'fraud', 'malware'] as const;
        const raw = (data.category ?? '').toLowerCase();
        const threatType: ThreatAnalysisResponse['threat_type'] = data.is_threat
          ? (VALID_TYPES.includes(raw as (typeof VALID_TYPES)[number])
              ? (raw as (typeof VALID_TYPES)[number])
              : 'scam')
          : 'safe';

        const steps = SOLUTION_STEPS[lang];
        const tips  = PREVENTION_TIPS[lang];

        return {
          threat_type:      threatType,
          confidence:       Math.round(Math.max(0, Math.min(1, data.confidence)) * 100), // normalise 0–100
          message:          typeof data.explanation === 'string' ? data.explanation.slice(0, 500) : '',
          solution_steps:   steps[threatType] ?? [],
          prevention_tips:  tips[threatType]  ?? [],
          domain_age_days:  typeof data.domain_age_days === 'number' ? data.domain_age_days : null,
          url_features:     urlFeatures,
        };
      } catch (error) {
        if (attempt === retries) {
          return this.localAnalysisFallback(message, lang);
        }
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      }
    }
    return this.localAnalysisFallback(message, lang);
  }

  async communityReport(data: CommunityReportRequest): Promise<{ success: boolean }> {
    try {
      const platformMap: Record<string, string> = {
        SMS: 'sms', WhatsApp: 'whatsapp', Telegram: 'telegram',
        Email: 'email', Call: 'call', Other: 'other',
      };
      const confidenceMap: Record<string, number> = {
        phishing: 0.78, fraud: 0.74, scam: 0.70, spam: 0.55, other: 0.60,
      };
      await this.axiosInstance.post('/api/threats', {
        type:        platformMap[data.platform] ?? 'other',
        content:     data.content,
        district:    data.district,
        description: `মোবাইল কমিউনিটি রিপোর্ট। সন্দেহজনক ধরন: ${data.threat_type}`,
        confidence:  confidenceMap[data.threat_type] ?? 0.60,
      });
      return { success: true };
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  async getDistrictStats(): Promise<DistrictStat[]> {
    try {
      const response = await this.axiosInstance.get<DistrictStat[]>('/api/districts', {
        timeout: 10000,
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  }

  async fetchFraudAlerts(): Promise<{ alerts: FraudAlertItem[]; fromCache: boolean; lastUpdated: number | null }> {
    // H3: deduplicate concurrent calls — return shared promise
    if (this._fraudAlertsFetch) return this._fraudAlertsFetch;
    this._fraudAlertsFetch = this._doFetchFraudAlerts().finally(() => {
      this._fraudAlertsFetch = null;
    });
    return this._fraudAlertsFetch;
  }

  private async _doFetchFraudAlerts(): Promise<{ alerts: FraudAlertItem[]; fromCache: boolean; lastUpdated: number | null }> {
    const CACHE_KEY = '@eprohori:fraud_alerts_cache';
    const CACHE_META_KEY = '@eprohori:fraud_alerts_meta';

    // Try the real backend alerts endpoint first (/api/fraud-alerts does not exist).
    // Shape (verified): { id, title, message, severity, created_at }
    try {
      interface RawAlert { id: number | string; title?: string; message?: string; severity?: string; created_at?: string }
      const alertRes = await this.axiosInstance.get<RawAlert[]>('/api/alerts', { timeout: 8000 });
      if (Array.isArray(alertRes.data) && alertRes.data.length > 0) {
        const now = Date.now();
        const mapped: FraudAlertItem[] = alertRes.data.map((a, i) => {
          const sev: FraudAlertItem['severity'] =
            a.severity === 'critical' ? 'critical' : a.severity === 'high' ? 'high' : 'medium';
          return {
            id:            String(a.id ?? `alert-${i}`),
            date:          a.created_at ? new Date(a.created_at).toLocaleDateString('bn-BD') : 'সম্প্রতি',
            category:      sev === 'critical' ? 'জরুরি সতর্কতা' : 'সতর্কতা',
            categoryColor: sev === 'critical' ? '#ff5555' : sev === 'high' ? '#ffb300' : '#818cf8',
            categoryIcon:  'alert-decagram-outline',
            title:         a.title ?? 'নতুন সতর্কতা',
            body:          a.message ?? '',
            tags:          ['বাংলাদেশ'],
            severity:      sev,
          };
        });
        try {
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(mapped));
          await AsyncStorage.setItem(CACHE_META_KEY, String(now));
        } catch {}
        return { alerts: mapped, fromCache: false, lastUpdated: now };
      }
    } catch {}

    // Legacy endpoint (kept in case the backend adds it later)
    try {
      const response = await this.axiosInstance.get<FraudAlertItem[]>('/api/fraud-alerts', { timeout: 8000 });
      if (Array.isArray(response.data) && response.data.length > 0) {
        const now = Date.now();
        // Persist to AsyncStorage for offline use.
        // H6: two sequential setItem calls are safe here because _fraudAlertsFetch
        // (H3 lock above) ensures only one _doFetchFraudAlerts() runs at a time.
        try {
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(response.data));
          await AsyncStorage.setItem(CACHE_META_KEY, String(now));
        } catch {}
        return { alerts: response.data, fromCache: false, lastUpdated: now };
      }
    } catch {}

    // Try fallback: transform recent threats from /api/threats as live alerts
    try {
      interface RawThreat { id?: string; content?: string; type?: string; district?: string; created_at?: string; confidence?: number }
      const fallback = await this.axiosInstance.get<RawThreat[]>('/api/threats', { timeout: 6000, params: { limit: 5 } });
      if (Array.isArray(fallback.data) && fallback.data.length > 0) {
        const mapped: FraudAlertItem[] = fallback.data.map((t, i) => ({
          id:            t.id ?? `live-${i}`,
          date:          t.created_at ? new Date(t.created_at).toLocaleDateString('bn-BD') : 'সম্প্রতি',
          category:      t.type === 'phishing' ? 'ফিশিং' : t.type === 'fraud' ? 'প্রতারণা' : 'স্প্যাম',
          categoryColor: t.type === 'phishing' ? '#ff5555' : t.type === 'fraud' ? '#818cf8' : '#ffb300',
          categoryIcon:  t.type === 'phishing' ? 'hook' : t.type === 'fraud' ? 'credit-card-off-outline' : 'alert-outline',
          title:         t.content ? t.content.slice(0, 60) : 'নতুন সতর্কতা',
          body:          t.content ?? '',
          tags:          [t.district ?? 'বাংলাদেশ', t.type ?? 'অজানা'],
          severity:      (t.confidence ?? 0) >= 0.75 ? 'critical' : (t.confidence ?? 0) >= 0.55 ? 'high' : 'medium',
        }));
        return { alerts: mapped, fromCache: false, lastUpdated: Date.now() };
      }
    } catch {}

    // Load from AsyncStorage cache
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const [cached, metaStr] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEY),
        AsyncStorage.getItem(CACHE_META_KEY),
      ]);
      if (cached) {
        return {
          alerts:      JSON.parse(cached) as FraudAlertItem[],
          fromCache:   true,
          lastUpdated: metaStr ? parseInt(metaStr, 10) : null,
        };
      }
    } catch {}

    return { alerts: [], fromCache: false, lastUpdated: null };
  }

  async submitSpamNumberReport(params: {
    number: string;
    category: string;
    note?: string;
  }): Promise<void> {
    try {
      await this.axiosInstance.post('/api/spam-numbers', {
        number:   params.number,
        category: params.category,
        note:     params.note ?? '',
      }, { timeout: 8000 });
    } catch {
      // Fire-and-forget — failure is non-critical
    }
  }

  async fetchCommunitySpamNumbers(): Promise<CommunitySpamEntry[]> {
    try {
      const response = await this.axiosInstance.get<CommunitySpamEntry[]>('/api/spam-numbers', {
        timeout: 8000,
        params: { limit: 200 },
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  }

  // S9: Crowdsourced Name Submission (Truecaller-style)
  async submitBulkNames(contacts: { name: string; numbers: string[] }[]): Promise<void> {
    try {
      await this.axiosInstance.post('/api/names/bulk', { contacts }, {
        timeout: 15000,
        headers: { 'X-EProhori-App-Secret': APP_SECRET }
      });
    } catch {
      // fire-and-forget
    }
  }

  async checkOnline(): Promise<boolean> {
    try {
      await this.axiosInstance.get('/health', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  // ── Auth Methods ─────────────────────────────────────────────────────────

  async login(email: string, password: string): Promise<UserAuthResponse> {
    try {
      const res = await this.axiosInstance.post<UserAuthResponse>('/api/auth/login', { email, password });
      return res.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  async register(data: any): Promise<UserAuthResponse> {
    try {
      const res = await this.axiosInstance.post<UserAuthResponse>('/api/auth/register', data);
      return res.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  // ── Admin Methods ────────────────────────────────────────────────────────

  async fetchPendingThreats(minConfidence?: number | null): Promise<any[]> {
    try {
      const res = await this.axiosInstance.get('/api/admin/pending', {
        params: { min_confidence: minConfidence }
      });
      return res.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  async verifyThreat(id: number): Promise<void> {
    try {
      await this.axiosInstance.patch(`/api/threats/${id}/verify`);
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  async rejectThreat(id: number): Promise<void> {
    try {
      await this.axiosInstance.put(`/api/threats/${id}/reject`);
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  private handleError(error: AxiosError): ApiError {
    if (error.response?.status === 429) return { code: 'RATE_LIMITED', message: 'Too many requests.' };
    if (error.response?.status === 500) return { code: 'SERVER_ERROR', message: 'Server error.' };
    if (error.code === 'ECONNABORTED') return { code: 'TIMEOUT', message: 'Request timeout. Check connection.' };
    if (!error.response) return { code: 'NETWORK_ERROR', message: 'Network error. Check internet connection.' };
    return { code: 'UNKNOWN_ERROR', message: 'An error occurred.', details: error.response?.data };
  }
}

export const threatAnalysisAPI = new ThreatAnalysisAPI();
