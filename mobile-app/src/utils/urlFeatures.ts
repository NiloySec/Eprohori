export interface UrlFeatures {
  is_url: boolean;
  domain: string;
  subdomain_count: number;
  has_ssl: boolean;
  is_direct_ip: boolean;
  risk_signals: string[];  // human-readable Bengali risk reasons
}

// Country-code second-level TLDs: .com.bd, .org.bd, .co.uk etc.
const SECOND_LEVEL_TLDS = new Set(['com', 'org', 'net', 'edu', 'gov', 'co', 'ac']);

function countSubdomains(hostname: string): number {
  const parts = hostname.split('.');
  if (parts.length <= 2) return 0;

  // Check for country SLD pattern: e.g. bkash.com.bd → parts = ['bkash','com','bd']
  const secondLast = parts[parts.length - 2];
  const registrableParts = SECOND_LEVEL_TLDS.has(secondLast) ? 3 : 2;

  return Math.max(0, parts.length - registrableParts);
}

export function analyzeUrlLocally(input: string): UrlFeatures {
  const trimmed = input.trim();
  const isUrl = /^https?:\/\//i.test(trimmed);

  if (!isUrl) {
    return { is_url: false, domain: '', subdomain_count: 0, has_ssl: false, is_direct_ip: false, risk_signals: [] };
  }

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.toLowerCase();

    const has_ssl = url.protocol === 'https:';
    const is_direct_ip = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
    const subdomain_count = is_direct_ip ? 0 : countSubdomains(hostname);

    const risk_signals: string[] = [];

    if (is_direct_ip) {
      risk_signals.push('🔴 IP address সরাসরি URL এ — অত্যন্ত সন্দেহজনক');
    }
    if (!has_ssl) {
      risk_signals.push('⚠️ HTTPS নেই — তথ্য অনিরাপদ');
    }
    if (subdomain_count >= 3) {
      risk_signals.push(`⚠️ ${subdomain_count}টি subdomain — ফিশিং প্যাটার্ন`);
    } else if (subdomain_count === 2) {
      risk_signals.push(`⚠️ ${subdomain_count}টি subdomain — সন্দেহজনক`);
    }

    return { is_url: true, domain: hostname, subdomain_count, has_ssl, is_direct_ip, risk_signals };
  } catch {
    return { is_url: true, domain: '', subdomain_count: 0, has_ssl: false, is_direct_ip: false, risk_signals: [] };
  }
}
