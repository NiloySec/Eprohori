const API_BASE = 'https://eprohori-production.up.railway.app';

const WHITELIST = [
  'google.com', 'google.co.uk', 'google.com.bd',
  'youtube.com',
  'facebook.com', 'fb.com',
  'instagram.com',
  'twitter.com', 'x.com',
  'whatsapp.com', 'web.whatsapp.com',
  'gmail.com',
  'outlook.com', 'live.com', 'hotmail.com',
  'amazon.com', 'amazon.co.uk',
  'github.com', 'github.io',
  'stackoverflow.com',
  'linkedin.com',
  'wikipedia.org',
  'reddit.com',
  'medium.com',
  'wordpress.com',
  'microsoft.com',
  'apple.com',
  'eprohori.tech',
];

// Single reference so we never stack duplicate escape listeners
let currentEscapeHandler = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelectedText') {
    sendResponse({ selectedText: window.getSelection().toString() });
  }
});

function isDomainWhitelisted(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return WHITELIST.some(d => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Intercept every link click
document.addEventListener('click', async (e) => {
  const link = e.target.closest('a');
  if (!link) return;

  const href = link.getAttribute('href');
  if (!href || !/^https?:\/\//i.test(href)) return;
  if (isDomainWhitelisted(href)) return;

  e.preventDefault();
  e.stopPropagation();

  const overlayId = showLinkWarning(href);
  analyzeUrl(href, overlayId);
}, true);

function showLinkWarning(url) {
  const overlayId = 'eprohori-' + Date.now();

  const overlay = document.createElement('div');
  overlay.id = overlayId;
  overlay.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0', 'bottom:0',
    'background:rgba(0,0,0,0.75)',
    'display:flex', 'align-items:center', 'justify-content:center',
    'z-index:2147483647',
    "font-family:'Segoe UI',Roboto,'Noto Sans Bengali',sans-serif",
  ].join(';');

  overlay.innerHTML = `
    <div class="ep-box" style="
      background:linear-gradient(135deg,#1a0a1f 0%,#2d1b3d 100%);
      border-radius:15px;padding:30px;max-width:450px;width:90%;
      color:#fff;box-shadow:0 10px 40px rgba(255,51,51,0.3);text-align:center;">
      <div style="font-size:40px;margin-bottom:15px;">⏳</div>
      <h2 style="margin:0 0 10px;font-size:22px;color:#00ffcc;">লিঙ্ক যাচাই করা হচ্ছে...</h2>
      <p style="margin:0 0 20px;color:#ddd;font-size:14px;">অনুগ্রহ করে অপেক্ষা করুন...</p>
      <div style="background:rgba(0,255,204,0.1);border-left:3px solid #00ffcc;
        padding:12px;margin:15px 0;text-align:left;border-radius:5px;">
        <p style="margin:0;font-size:12px;color:#00ffcc;word-break:break-all;">
          ${escapeHtml(url.substring(0, 80))}${url.length > 80 ? '…' : ''}
        </p>
      </div>
      <div style="display:flex;gap:10px;margin-top:20px;">
        <button class="ep-cancel" style="
          flex:1;background:linear-gradient(135deg,#00ffcc,#00dd99);
          color:#000;border:none;padding:12px;border-radius:8px;
          font-weight:600;cursor:pointer;font-size:14px;">← ফিরে যান</button>
        <button class="ep-proceed" disabled style="
          flex:1;background:rgba(100,100,100,0.5);color:#999;
          border:1px solid #666;padding:12px;border-radius:8px;
          font-weight:600;cursor:not-allowed;font-size:14px;">⏳ অপেক্ষা করুন...</button>
      </div>
      <p style="margin:15px 0 0;font-size:11px;color:#999;">🛡️ EProhori দ্বারা বিশ্লেষণ হচ্ছে</p>
    </div>
  `;

  // Replace old escape handler so we never stack them
  if (currentEscapeHandler) {
    document.removeEventListener('keydown', currentEscapeHandler);
  }
  currentEscapeHandler = (ev) => {
    if (ev.key === 'Escape') {
      const el = document.getElementById(overlayId);
      if (el) el.remove();
      document.removeEventListener('keydown', currentEscapeHandler);
      currentEscapeHandler = null;
    }
  };
  document.addEventListener('keydown', currentEscapeHandler);

  overlay.querySelector('.ep-cancel').addEventListener('click', () => overlay.remove());

  // Use documentElement as fallback if body not parsed yet (document_start)
  (document.body || document.documentElement).appendChild(overlay);
  return overlayId;
}

async function analyzeUrl(url, overlayId) {
  try {
    const res = await fetch(`${API_BASE}/api/validate/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: url, type: 'url' }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    updateOverlay(overlayId, data, url);
  } catch (err) {
    console.error('[EProhori]', err);
    updateOverlayError(overlayId, url);
  }
}

function updateOverlay(overlayId, data, url) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;

  const box = overlay.querySelector('.ep-box');
  const confidence = Math.round((data.confidence || 0) * 100);
  const isThreat = data.is_threat && confidence > 60;
  const isSuspicious = data.is_threat && confidence > 40;

  let icon = '✅';
  let title = 'এই লিঙ্ক নিরাপদ';
  let msg = 'এটি একটি বিশ্বস্ত ডোমেইন বলে মনে হয়।';
  let color = '#00ffcc';
  let btnBg = 'linear-gradient(135deg,#00ffcc,#00dd99)';
  let btnColor = '#000';
  let btnText = '✓ যান';

  if (isThreat) {
    icon = '🔴';
    title = 'এটি একটি হুমকি!';
    msg = `এই লিঙ্কটি সম্ভবত ফিশিং/স্কাম (${confidence}% নিশ্চিত)`;
    color = '#ff5555';
    btnBg = 'rgba(255,85,85,0.2)';
    btnColor = '#ff5555';
    btnText = '⚠️ ঝুঁকি নিই';
  } else if (isSuspicious) {
    icon = '⚠️';
    title = 'এই লিঙ্ক সন্দেহজনক';
    msg = `সন্দেহজনক বৈশিষ্ট্য পাওয়া গেছে (${confidence}% নিশ্চিত)`;
    color = '#ffb300';
    btnBg = 'rgba(255,179,0,0.2)';
    btnColor = '#ffb300';
    btnText = '⚠️ সতর্কে যান';
  }

  const reasonsHtml = (data.reasons || []).length
    ? `<div style="background:rgba(255,255,255,0.05);border-left:3px solid ${color};
        padding:12px;margin:12px 0;text-align:left;border-radius:5px;">
        ${data.reasons.map(r =>
          `<p style="margin:3px 0;font-size:11px;color:${color};">• ${escapeHtml(r)}</p>`
        ).join('')}
       </div>`
    : '';

  box.innerHTML = `
    <div style="font-size:40px;margin-bottom:15px;">${icon}</div>
    <h2 style="margin:0 0 10px;font-size:22px;color:${color};">${title}</h2>
    <p style="margin:0 0 15px;color:#ddd;font-size:14px;">${msg}</p>
    <div style="background:rgba(0,255,204,0.07);border-left:3px solid ${color};
      padding:12px;margin:12px 0;text-align:left;border-radius:5px;">
      <p style="margin:0;font-size:12px;color:${color};word-break:break-all;">
        ${escapeHtml(url.substring(0, 80))}${url.length > 80 ? '…' : ''}
      </p>
    </div>
    ${reasonsHtml}
    <div style="display:flex;gap:10px;margin-top:20px;">
      <button class="ep-cancel" style="
        flex:1;background:linear-gradient(135deg,#667eea,#5a5a9f);
        color:#fff;border:none;padding:12px;border-radius:8px;
        font-weight:600;cursor:pointer;font-size:14px;">← ফিরে যান</button>
      <button class="ep-proceed" style="
        flex:1;background:${btnBg};color:${btnColor};
        border:1px solid ${color};padding:12px;border-radius:8px;
        font-weight:600;cursor:pointer;font-size:14px;">${btnText}</button>
    </div>
    <p style="margin:15px 0 0;font-size:11px;color:#999;">🛡️ EProhori বিশ্লেষণ সম্পন্ন</p>
  `;

  overlay.querySelector('.ep-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('.ep-proceed').addEventListener('click', () => {
    overlay.remove();
    window.open(url, '_blank');
  });
}

function updateOverlayError(overlayId, url) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;

  const box = overlay.querySelector('.ep-box');
  box.innerHTML = `
    <div style="font-size:40px;margin-bottom:15px;">⚠️</div>
    <h2 style="margin:0 0 10px;font-size:22px;color:#ffb300;">বিশ্লেষণ ব্যর্থ হয়েছে</h2>
    <p style="margin:0 0 15px;color:#ddd;font-size:14px;">
      নেটওয়ার্ক সমস্যা বা API অনুপলব্ধ।
    </p>
    <div style="display:flex;gap:10px;margin-top:20px;">
      <button class="ep-cancel" style="
        flex:1;background:linear-gradient(135deg,#667eea,#5a5a9f);
        color:#fff;border:none;padding:12px;border-radius:8px;
        font-weight:600;cursor:pointer;font-size:14px;">← ফিরে যান</button>
      <button class="ep-proceed" style="
        flex:1;background:rgba(255,179,0,0.2);color:#ffb300;
        border:1px solid #ffb300;padding:12px;border-radius:8px;
        font-weight:600;cursor:pointer;font-size:14px;">⚠️ তবুও যান</button>
    </div>
    <p style="margin:15px 0 0;font-size:11px;color:#999;">🛡️ EProhori</p>
  `;

  overlay.querySelector('.ep-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('.ep-proceed').addEventListener('click', () => {
    overlay.remove();
    window.open(url, '_blank');
  });
}

console.log('[EProhori] Content script loaded — link protection active');
