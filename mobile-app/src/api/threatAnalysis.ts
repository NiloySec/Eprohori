import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'https://eprohori-production.up.railway.app';
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT || '30000', 10);

export interface ThreatAnalysisResponse {
  threat_type: 'phishing' | 'scam' | 'fraud' | 'malware' | 'safe';
  confidence: number;
  message: string;
  solution_steps: string[];
  prevention_tips: string[];
  domain_age?: number;
  domain_info?: {
    domain: string;
    registered_date: string;
    registrar: string;
  };
}

interface ValidateTextResponse {
  is_threat: boolean;
  confidence: number;
  category: string;
  reasons: string[];
  explanation: string | null;
  source: string;
  real_domain: string | null;
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

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'EProhori-Mobile/1.0.0',
      },
    });

    this.axiosInstance.interceptors.request.use(
      (config) => { console.log('[API]', config.method?.toUpperCase(), config.url); return config; },
      (error) => Promise.reject(error)
    );
    this.axiosInstance.interceptors.response.use(
      (response) => { console.log('[API] ←', response.status); return response; },
      (error) => Promise.reject(error)
    );
  }

  async analyzeThreat(
    message: string,
    language: 'bn' | 'en' = 'bn',
    retries = 3
  ): Promise<ThreatAnalysisResponse> {
    const payload = { text: message, type: 'sms' };
    const lang = language === 'en' ? 'en' : 'bn';

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await this.axiosInstance.post<ValidateTextResponse>(
          '/api/validate/text',
          payload
        );
        const data = response.data;

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
          confidence:       data.confidence,
          message:          data.explanation ?? '',
          solution_steps:   steps[threatType] ?? [],
          prevention_tips:  tips[threatType]  ?? [],
        };
      } catch (error) {
        const axiosError = error as AxiosError;
        if (attempt === retries) throw this.handleError(axiosError);
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      }
    }
    throw new Error('Failed after retries');
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

  async checkOnline(): Promise<boolean> {
    try {
      await this.axiosInstance.get('/health', { timeout: 5000 });
      return true;
    } catch {
      return false;
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
