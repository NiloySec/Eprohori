const API_URL = 'https://eprohori-production.up.railway.app/api/chatbot/analyze';

// DOM Elements
const messageInput = document.getElementById('messageInput');
const languageSelect = document.getElementById('languageSelect');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultsSection = document.getElementById('resultsSection');
const reportBtn = document.getElementById('reportBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  checkSelectedText();
  analyzeBtn.addEventListener('click', analyzeMessage);
  reportBtn.addEventListener('click', reportThreat);
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
  // Threat Type
  document.getElementById('threatType').textContent = result.threat_type || 'Unknown';
  const threatClass = `badge-${(result.threat_type || '').toLowerCase()}`;
  document.getElementById('threatType').className = `badge ${threatClass}`;

  // Severity
  document.getElementById('severity').textContent = result.severity || 'Medium';
  const severityClass = `badge-${(result.severity || '').toLowerCase()}`;
  document.getElementById('severity').className = `badge ${severityClass}`;

  // Risk Level (Confidence)
  const confidence = Math.round((result.confidence || 0) * 100);
  document.getElementById('riskPercent').textContent = `${confidence}%`;
  document.getElementById('riskBar').style.width = `${confidence}%`;

  // Color code risk bar
  if (confidence >= 80) {
    document.getElementById('riskBar').style.background = '#d32f2f'; // Red
  } else if (confidence >= 50) {
    document.getElementById('riskBar').style.background = '#f57c00'; // Orange
  } else {
    document.getElementById('riskBar').style.background = '#ffb300'; // Yellow
  }

  // Description
  let description = result.description || 'No description available';
  if (result.blocklist_match) {
    description = `⚠️ BLOCKLISTED: ${result.blocklist_match.reason}\n${description}`;
  }
  document.getElementById('description').textContent = description;

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

  resultsSection.classList.remove('hidden');

  // Store for reporting
  chrome.storage.local.set({
    currentResult: result,
    currentMessage: message
  });
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
