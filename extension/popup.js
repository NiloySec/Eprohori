const API_BASE = 'https://eprohori-production.up.railway.app';

const messageInput = document.getElementById('messageInput');
const languageSelect = document.getElementById('languageSelect');
const analyzeBtn = document.getElementById('analyzeBtn');
const analysisView = document.getElementById('analysisView');
const resultsSection = document.getElementById('resultsSection');
const backBtn = document.getElementById('backBtn');
const reportBtn = document.getElementById('reportBtn');

document.addEventListener('DOMContentLoaded', () => {
  analysisView.classList.remove('hidden');
  checkSelectedText();
  analyzeBtn.addEventListener('click', analyzeMessage);
  backBtn.addEventListener('click', backToAnalysis);
  reportBtn.addEventListener('click', openReportPage);
});

async function checkSelectedText() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'getSelectedText' }, (response) => {
      if (chrome.runtime.lastError) return; // content script not injected on this page
      if (response && response.selectedText) {
        messageInput.value = response.selectedText;
      }
    });
  } catch (e) {}
}

function detectType(text) {
  return /^https?:\/\//i.test(text.trim()) ? 'url' : 'sms';
}

async function analyzeMessage() {
  const message = messageInput.value.trim();
  if (!message) {
    alert('বিশ্লেষণের জন্য টেক্সট লিখুন');
    return;
  }

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = '⏳ বিশ্লেষণ হচ্ছে...';

  try {
    const type = detectType(message);
    const response = await fetch(`${API_BASE}/api/validate/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message, type }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    displayResults(data, message);
    saveToHistory(message, data);
  } catch (error) {
    alert('বিশ্লেষণ ব্যর্থ: ' + error.message);
    console.error('[EProhori]', error);
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = '🔍 এখনই বিশ্লেষণ করুন';
  }
}

function displayResults(data, message) {
  const confidence = Math.round((data.confidence || 0) * 100);
  const isThreat = data.is_threat && confidence > 40;
  const category = (data.category || 'safe').toLowerCase();

  const warningIcon = document.querySelector('.warning-icon');
  const threatTitle = document.getElementById('threatTypeDisplay');
  const threatDesc = document.getElementById('threatDescription');

  document.getElementById('suspiciousUrl').textContent = message.substring(0, 100);

  if (!isThreat) {
    // Safe result
    warningIcon.style.background = 'linear-gradient(135deg,#00c853 0%,#00e676 100%)';
    warningIcon.style.boxShadow = '0 10px 30px rgba(0,200,83,0.3)';
    warningIcon.textContent = '✅';
    threatTitle.style.color = '#00e676';
    threatTitle.textContent = '✅ নিরাপদ';
    threatDesc.textContent = `এই বার্তাটি নিরাপদ বলে মনে হচ্ছে (${confidence}% নিশ্চিত)`;
    document.getElementById('stepsSection').style.display = 'none';
    document.getElementById('tipsSection').style.display = 'none';
  } else {
    // Threat result
    warningIcon.style.background = 'linear-gradient(135deg,#ff5555 0%,#ff3333 100%)';
    warningIcon.style.boxShadow = '0 10px 30px rgba(255,51,51,0.3)';
    warningIcon.textContent = '⚠️';
    threatTitle.style.color = '#ff5555';
    threatTitle.textContent = getThreatEmoji(category) + ' ' + getThreatLabel(category);
    threatDesc.textContent = getThreatDescription(category, confidence);

    // Show reasons as solution steps
    const reasons = data.reasons || [];
    if (reasons.length > 0) {
      document.getElementById('stepsSection').style.display = 'block';
      document.getElementById('solutionSteps').innerHTML =
        reasons.map(r => `<li>${r}</li>`).join('');
    } else {
      document.getElementById('stepsSection').style.display = 'none';
    }

    // Show explanation as prevention tip
    if (data.explanation) {
      document.getElementById('tipsSection').style.display = 'block';
      document.getElementById('preventionTips').innerHTML = `<li>${data.explanation}</li>`;
    } else {
      document.getElementById('tipsSection').style.display = 'none';
    }
  }

  analysisView.classList.add('hidden');
  resultsSection.classList.remove('hidden');
  chrome.storage.local.set({ currentResult: data, currentMessage: message });
}

function backToAnalysis() {
  resultsSection.classList.add('hidden');
  analysisView.classList.remove('hidden');
  messageInput.value = '';
}

function openReportPage() {
  chrome.tabs.create({ url: 'https://eprohori.tech/report' });
}

function getThreatEmoji(category) {
  return { phishing: '🎣', scam: '💰', fraud: '🚨', malware: '☠️' }[category] || '⚠️';
}

function getThreatLabel(category) {
  return { phishing: 'ফিশিং', scam: 'প্রতারণা', fraud: 'জালিয়াতি', malware: 'ম্যালওয়্যার' }[category] || 'হুমকি';
}

function getThreatDescription(category, confidence) {
  return ({
    phishing: `এই লিঙ্ক ফিশিং সতর্কতা (${confidence}% নিশ্চিত)`,
    scam: `এটি সম্ভাব্য প্রতারণা (${confidence}% নিশ্চিত)`,
    fraud: `জালিয়াতির সন্দেহ (${confidence}% নিশ্চিত)`,
    malware: `ম্যালওয়্যার বিপদ (${confidence}% নিশ্চিত)`,
  })[category] || `হুমকি সনাক্ত হয়েছে (${confidence}% নিশ্চিত)`;
}

function saveToHistory(message, data) {
  chrome.storage.local.get('analysisHistory', (stored) => {
    const history = stored.analysisHistory || [];
    history.unshift({ message, result: data, timestamp: new Date().toISOString() });
    if (history.length > 50) history.pop();
    chrome.storage.local.set({ analysisHistory: history });
  });
}
