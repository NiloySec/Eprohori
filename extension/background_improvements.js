/**
 * EProhori Web Extension - Enhanced Background Script
 * Real-time blocklist updates + intelligent caching
 */

const CONFIG = {
  BLOCKLIST_UPDATE_INTERVAL: 30 * 60 * 1000, // 30 minutes
  THREAT_CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours
  API_BASE: 'https://api.eprohori.tech',
  TIMEOUT: 5000
};

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  console.log('[EProhori] Extension installed');
  initializeBlocklist();
  scheduleBlocklistUpdates();
});

// Fetch and cache blocklist
async function fetchBlocklist() {
  try {
    const response = await fetch(`${CONFIG.API_BASE}/api/threats/blocklist`, {
      timeout: CONFIG.TIMEOUT
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const timestamp = Date.now();

    // Cache blocklist
    chrome.storage.local.set({
      blocklist: {
        threats: data.threats || [],
        domains: data.domains || [],
        urls: data.urls || [],
        timestamp: timestamp,
        ttl: CONFIG.THREAT_CACHE_TTL
      }
    });

    console.log(`[EProhori] Updated blocklist: ${data.threats?.length || 0} threats`);
    return data;

  } catch (error) {
    console.error('[EProhori] Failed to fetch blocklist:', error);
    return null;
  }
}

// Initialize blocklist on first install
async function initializeBlocklist() {
  const { blocklist } = await chrome.storage.local.get('blocklist');

  if (!blocklist || Date.now() - blocklist.timestamp > blocklist.ttl) {
    await fetchBlocklist();
  }
}

// Schedule periodic updates
function scheduleBlocklistUpdates() {
  chrome.alarms.create('updateBlocklist', {
    periodInMinutes: CONFIG.BLOCKLIST_UPDATE_INTERVAL / (60 * 1000)
  });
}

// Update blocklist on alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updateBlocklist') {
    console.log('[EProhori] Scheduled blocklist update');
    fetchBlocklist();
  }
});

// Check if URL is in blocklist
async function isUrlBlocklisted(url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const pathname = urlObj.pathname;

    const { blocklist } = await chrome.storage.local.get('blocklist');

    if (!blocklist) {
      console.warn('[EProhori] Blocklist not initialized');
      return false;
    }

    // Check domain
    if (blocklist.domains?.includes(domain)) {
      return {
        blocked: true,
        reason: 'MALICIOUS_DOMAIN',
        domain: domain,
        severity: 'high'
      };
    }

    // Check full URL
    if (blocklist.urls?.includes(url)) {
      return {
        blocked: true,
        reason: 'MALICIOUS_URL',
        url: url,
        severity: 'critical'
      };
    }

    // Pattern matching for known phishing patterns
    if (isPhishingPattern(domain, pathname)) {
      return {
        blocked: true,
        reason: 'PHISHING_PATTERN',
        domain: domain,
        severity: 'high'
      };
    }

    return { blocked: false };

  } catch (error) {
    console.error('[EProhori] Error checking URL:', error);
    return { blocked: false };
  }
}

// Detect phishing patterns
function isPhishingPattern(domain, pathname) {
  const phishingPatterns = [
    /password/i,
    /verify/i,
    /confirm/i,
    /update.*payment/i,
    /secure.*login/i,
    /account.*verification/i,
  ];

  const suspiciousDomains = [
    'bit.ly',
    'tinyurl.com',
    'short.link',
  ];

  // Check suspicious shortener domains
  if (suspiciousDomains.some(d => domain.includes(d))) {
    return true;
  }

  // Check pathnames for phishing keywords
  if (phishingPatterns.some(p => p.test(pathname))) {
    return true;
  }

  return false;
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkUrl') {
    isUrlBlocklisted(request.url).then(result => {
      sendResponse(result);
    });
    return true; // Will respond asynchronously
  }

  if (request.action === 'reportThreat') {
    reportThreatToAPI(request.threat).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'updateBlocklist') {
    fetchBlocklist().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Report threat to API
async function reportThreatToAPI(threat) {
  try {
    const response = await fetch(`${CONFIG.API_BASE}/api/threats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify({
        entity_type: threat.type,
        entity_value: threat.value,
        source: 'web_extension',
        platform: 'website',
        details: threat.details
      }),
      timeout: CONFIG.TIMEOUT
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    console.log('[EProhori] Threat reported successfully');
    return true;

  } catch (error) {
    console.error('[EProhori] Failed to report threat:', error);
    return false;
  }
}

// Get auth token from storage
async function getAuthToken() {
  const { authToken } = await chrome.storage.sync.get('authToken');
  return authToken || '';
}

// Monitor for new threats
chrome.webRequest.onBeforeRequest.addListener(
  async (details) => {
    if (details.initiator === 'chrome-extension://') return; // Ignore extension requests

    const result = await isUrlBlocklisted(details.url);

    if (result.blocked) {
      console.warn(`[EProhori] Blocked: ${result.reason}`);

      // Show warning
      chrome.tabs.executeScript(details.tabId, {
        code: `
          alert('⚠️ EProhori: Potential threat detected\\n${result.reason}\\nURL: ${details.url}');
        `
      });

      // Can optionally block the request
      // return { cancel: true };
    }
  },
  { urls: ['<all_urls>'] },
  ['blocking']
);

// Periodic cache cleanup
setInterval(() => {
  chrome.storage.local.get('blocklist', (data) => {
    if (data.blocklist) {
      const age = Date.now() - data.blocklist.timestamp;
      if (age > data.blocklist.ttl) {
        console.log('[EProhori] Blocklist cache expired, refreshing...');
        fetchBlocklist();
      }
    }
  });
}, 60 * 60 * 1000); // Check every hour

console.log('[EProhori] Background script loaded');
