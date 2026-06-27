/**
 * EProhori Content Script
 * Real-time threat detection in web pages
 */

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelectedText') {
    const selectedText = window.getSelection().toString();
    sendResponse({ selectedText: selectedText });
  }
});

// Highlight suspicious links on the page
function highlightSuspiciousLinks() {
  const links = document.querySelectorAll('a');

  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;

    // Check for phishing patterns
    const suspiciousPatterns = [
      /password/i,
      /verify/i,
      /confirm/i,
      /update.*payment/i,
      /secure.*login/i,
      /account.*verification/i,
    ];

    const suspiciousShorteners = [
      'bit.ly',
      'tinyurl.com',
      'short.link',
      'ow.ly',
      'goo.gl'
    ];

    let isSuspicious = false;

    // Check for shorteners
    if (suspiciousShorteners.some(s => href.includes(s))) {
      isSuspicious = true;
    }

    // Check for phishing keywords
    if (suspiciousPatterns.some(p => p.test(href))) {
      isSuspicious = true;
    }

    if (isSuspicious) {
      // Add warning badge
      link.style.outline = '2px solid #d32f2f';
      link.style.outlineOffset = '2px';

      const badge = document.createElement('span');
      badge.textContent = '⚠️ Suspicious';
      badge.style.cssText = `
        display: inline-block;
        background: #ffebee;
        color: #d32f2f;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 10px;
        font-weight: 600;
        margin-left: 5px;
      `;
      link.parentNode.insertBefore(badge, link.nextSibling);

      // Add click handler to warn user
      link.addEventListener('click', (e) => {
        const confirmed = confirm(
          `⚠️ EProhori Warning!\n\nThis link appears suspicious.\n\nURL: ${href}\n\nDo you want to proceed?`
        );
        if (!confirmed) {
          e.preventDefault();
          e.stopPropagation();
        }
      });
    }
  });
}

// Monitor page for new messages (Gmail, WhatsApp, etc.)
function monitorMessages() {
  const observer = new MutationObserver(() => {
    highlightSuspiciousLinks();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true
  });
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    highlightSuspiciousLinks();
    monitorMessages();
  });
} else {
  highlightSuspiciousLinks();
  monitorMessages();
}

// Right-click context menu for analysis
document.addEventListener('contextmenu', (e) => {
  const selectedText = window.getSelection().toString();
  if (selectedText) {
    // Will be handled by popup when user clicks analyze
  }
});

console.log('[EProhori] Content script loaded - ready for threat detection');
