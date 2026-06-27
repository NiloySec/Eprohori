const API_URL = 'https://eprohori-production.up.railway.app/api/chatbot/analyze';

// DOM Elements
const messageInput = document.getElementById('messageInput');
const languageSelect = document.getElementById('languageSelect');
const analyzeBtn = document.getElementById('analyzeBtn');
const analysisView = document.getElementById('analysisView');
const resultsSection = document.getElementById('resultsSection');
const reportBtn = document.getElementById('reportBtn');
const backBtn = document.getElementById('backBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  analysisView.classList.remove('hidden');
  loadStats();
  checkSelectedText();
  analyzeBtn.addEventListener('click', analyzeMessage);
  reportBtn.addEventListener('click', reportThreat);
  backBtn.addEventListener('click', backToAnalysis);
});

// Check for selected text in current tab
async function checkSelectedText() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'getSelectedText' }, (response) => {
      if (response && response.selectedText) {
        messageInput.value = response.selectedText;
      }
    });
  } catch (e) {
    // No selected text or content script not ready
  }
}

// Check URL against blocklist (OLD FEATURE)
async function checkUrlBlocklist(url) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: 'checkUrl', url: url },
      (response) => {
        resolve(response || { blocked: false });
      }
    );
  });
}

// Analyze message
async function analyzeMessage() {
  const message = messageInput.value.trim();
  const language = languageSelect.value;

  if (!message) {
    alert('Please enter text to analyze');
    return;
  }

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = '⏳ Analyzing...';

  try {
    // Check blocklist first (OLD FEATURE)
    const blocklistCheck = await checkUrlBlocklist(message);

    // Then do AI analysis
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        language: language
      })
    });

    const data = await response.json();

    // Merge blocklist result with AI analysis
    if (blocklistCheck.blocked) {
      data.blocklist_match = blocklistCheck;
      data.confidence = Math.min(1.0, (data.confidence || 0) + 0.2); // Boost confidence if blocklisted
      data.severity = 'Critical';
    }

    displayResults(data, message);
    saveToHistory(message, data);
  } catch (error) {
    alert('Error analyzing message: ' + error.message);
    console.error(error);
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = '🔍 Analyze Now';
  }
}

// Display results
function displayResults(result, message) {
  const confidence = Math.round((result.confidence || 0) * 100);
  const threatType = result.threat_type || 'Unknown';

  // Update threat display
  document.getElementById('threatTypeDisplay').textContent = getThreatEmoji(threatType) + ' ' + threatType;

  // Bengali description
  const bengaliDesc = getThreatBengaliDescription(threatType, confidence);
  document.getElementById('threatDescription').textContent = bengaliDesc;

  // Display suspicious URL/message
  document.getElementById('suspiciousUrl').textContent = message.substring(0, 100);

  // Solution steps
  if (result.solution_steps && result.solution_steps.length > 0) {
    document.getElementById('stepsSection').style.display = 'block';
    const stepsHtml = result.solution_steps.map(step => `<li>${step}</li>`).join('');
    document.getElementById('solutionSteps').innerHTML = stepsHtml;
  }

  // Prevention tips
  if (result.prevention_tips && result.prevention_tips.length > 0) {
    document.getElementById('tipsSection').style.display = 'block';
    const tipsHtml = result.prevention_tips.map(tip => `<li>${tip}</li>`).join('');
    document.getElementById('preventionTips').innerHTML = tipsHtml;
  }

  // Show results, hide analysis
  analysisView.classList.add('hidden');
  resultsSection.classList.remove('hidden');

  // Store for reporting
  chrome.storage.local.set({
    currentResult: result,
    currentMessage: message
  });
}

// Back to analysis
function backToAnalysis() {
  resultsSection.classList.add('hidden');
  analysisView.classList.remove('hidden');
  messageInput.value = '';
}

// Get threat emoji
function getThreatEmoji(threatType) {
  const emojis = {
    'phishing': '🎣',
    'scam': '💰',
    'fraud': '🚨',
    'malware': '⚠️'
  };
  return emojis[threatType?.toLowerCase()] || '⚠️';
}

// Get Bengali description
function getThreatBengaliDescription(threatType, confidence) {
  const descriptions = {
    'phishing': `এই লিঙ্ক ফিশিং সতর্কতা (${confidence}% নিশ্চিত)`,
    'scam': `এটি সম্ভাব্য প্রতারণা (${confidence}% নিশ্চিত)`,
    'fraud': `জালিয়াতির সন্দেহ (${confidence}% নিশ্চিত)`,
    'malware': `ম্যালওয়্যার বিপদ (${confidence}% নিশ্চিত)`
  };
  return descriptions[threatType?.toLowerCase()] || `হুমকি সনাক্ত হয়েছে (${confidence}% নিশ্চিত)`;
}

// Report threat (OLD FEATURE)
function reportThreat() {
  chrome.storage.local.get(['currentMessage', 'currentResult'], (data) => {
    if (data.currentMessage && data.currentResult) {
      // Send to background script to report via API (OLD FEATURE)
      chrome.runtime.sendMessage({
        action: 'reportThreat',
        threat: {
          type: data.currentResult.threat_type,
          value: data.currentMessage,
          details: {
            severity: data.currentResult.severity,
            confidence: data.currentResult.confidence,
            description: data.currentResult.description
          }
        }
      }, (response) => {
        if (response && response.success) {
          alert('✅ Thank you! Threat reported to EProhori.');
        } else {
          alert('⚠️ Could not report threat. Try again later.');
        }
      });
    }
  });
}

// Load stats
async function loadStats() {
  try {
    const response = await fetch('https://eprohori-production.up.railway.app/api/stats');
    const data = await response.json();

    document.getElementById('statThreats').textContent = data.total_threats || '0';
    document.getElementById('statUsers').textContent = data.total_users || '0';
  } catch (error) {
    document.getElementById('statThreats').textContent = '?';
    document.getElementById('statUsers').textContent = '?';
  }
}

// Save to history
function saveToHistory(message, result) {
  chrome.storage.local.get('analysisHistory', (data) => {
    const history = data.analysisHistory || [];
    history.unshift({
      message: message,
      result: result,
      timestamp: new Date().toISOString()
    });
    if (history.length > 50) history.pop();
    chrome.storage.local.set({ analysisHistory: history });
  });
}
