// Ward Content Script
// Extracts visible page content and sends it for analysis

console.log('[Ward] Content script loaded and running');

// Extract all visible text content from the page
function extractVisibleContent() {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        // Skip scripts, styles, etc.
        const tagName = parent.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'iframe'].includes(tagName)) {
          return NodeFilter.FILTER_REJECT;
        }

        // Skip if text is empty or just whitespace
        if (!node.textContent.trim()) {
          return NodeFilter.FILTER_REJECT;
        }

        // Check if element is actually visible
        const style = window.getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          return NodeFilter.FILTER_REJECT;
        }

        // Check if element is in the current viewport or very close to it
        const rect = parent.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const windowWidth = window.innerWidth || document.documentElement.clientWidth;

        // Only include elements that are in viewport or just outside it (within 1 viewport height/width)
        // This catches sidebar content but excludes far-off scrolled content
        if (rect.bottom < -windowHeight ||
            rect.top > windowHeight * 2 ||
            rect.right < 0 ||
            rect.left > windowWidth) {
          return NodeFilter.FILTER_REJECT;
        }

        // Skip if element has zero size
        if (rect.width === 0 || rect.height === 0) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textContent = [];
  let node;
  while (node = walker.nextNode()) {
    textContent.push(node.textContent.trim());
  }

  // Join all text with spaces and clean up
  let fullText = textContent.join(' ');
  fullText = fullText.replace(/\s+/g, ' ').trim();

  return fullText;
}

// Show warning banner if malicious content detected
function showWarningBanner(analysisResult) {
  // Check if banner already exists
  if (document.getElementById('ward-warning-banner')) {
    return;
  }

  // Use the judge's detailed reasoning (judgment field) instead of generic analysis
  const judgmentText = analysisResult.judgment || analysisResult.analysis || '';

  // Split judgment into sentences or key points
  const findings = judgmentText
    .split(/[.!]\s+/)
    .filter(sentence => sentence.trim().length > 20)
    .slice(0, 4)  // Show up to 4 findings
    .map(finding => finding.trim());

  // Build findings HTML
  let findingsHTML = '';
  if (findings.length > 0) {
    findingsHTML = `
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.2);">
        <div style="font-size: 12px; font-weight: 600; margin-bottom: 8px; opacity: 0.9;">
          AI Detected:
        </div>
        <ul style="margin: 0; padding-left: 20px; font-size: 12px; opacity: 0.95; line-height: 1.6;">
          ${findings.map(finding => `
            <li style="margin-bottom: 6px;">${finding}</li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  const banner = document.createElement('div');
  banner.id = 'ward-warning-banner';
  banner.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%);
      color: white;
      padding: 16px 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 2147483647;
      animation: slideDown 0.3s ease-out;
      max-height: 400px;
      overflow-y: auto;
    ">
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <div style="flex: 1;">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
              <div style="font-weight: 600; margin-bottom: 4px;">
                🛡️ Ward Threat Detected
              </div>
              <div style="font-size: 13px; opacity: 0.95;">
                This page contains suspicious content. Exercise caution and avoid sharing personal information.
              </div>
            </div>
            <button id="ward-close-banner" style="
              background: rgba(255, 255, 255, 0.2);
              border: none;
              color: white;
              padding: 6px 12px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 12px;
              font-weight: 500;
              transition: background 0.2s;
              flex-shrink: 0;
              margin-left: 12px;
            " onmouseover="this.style.background='rgba(255,255,255,0.3)'"
               onmouseout="this.style.background='rgba(255,255,255,0.2)'">
              Dismiss
            </button>
          </div>
          ${findingsHTML}
        </div>
      </div>
    </div>
    <style>
      @keyframes slideDown {
        from {
          transform: translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      #ward-warning-banner::-webkit-scrollbar {
        width: 8px;
      }
      #ward-warning-banner::-webkit-scrollbar-track {
        background: rgba(0,0,0,0.1);
        border-radius: 4px;
      }
      #ward-warning-banner::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.3);
        border-radius: 4px;
      }
      #ward-warning-banner::-webkit-scrollbar-thumb:hover {
        background: rgba(255,255,255,0.4);
      }
    </style>
  `;

  document.body.appendChild(banner);

  // Add close button handler
  document.getElementById('ward-close-banner').addEventListener('click', () => {
    banner.remove();
  });
}

// Track if analysis is in progress to prevent duplicate requests
let analysisInProgress = false;
let lastAnalyzedContent = '';

// Analyze page content when loaded
async function analyzePage() {
  try {
    // Prevent multiple simultaneous analyses
    if (analysisInProgress) {
      console.log('[Ward] Analysis already in progress, skipping...');
      return;
    }

    // Skip email inbox list views - only analyze individual message views
    const url = window.location.href;

    // Gmail: Skip inbox list, only analyze individual messages
    if (url.includes('mail.google.com')) {
      // Gmail individual message URLs have format: #inbox/messageId or #label/messageId
      // Inbox list views are just: #inbox or #inbox?compose=new
      const hashPart = url.split('#')[1] || '';
      const pathSegments = hashPart.split('/');

      // If no second segment (after inbox/label), it's a list view
      if (pathSegments.length < 2 || !pathSegments[1]) {
        console.log('[Ward] Skipping Gmail inbox list view - only analyzing individual messages');
        await chrome.runtime.sendMessage({
          action: 'analyzeContent',
          content: '',
          skipped: true
        });
        return;
      }
      console.log('[Ward] Gmail individual message detected, proceeding with analysis');
    }

    // Outlook: Skip inbox list views
    if (url.includes('outlook.live.com') || url.includes('outlook.office.com')) {
      // Outlook message view has /mail/id/ in the URL
      // Inbox list is just /mail/inbox or /mail/0/
      if (!url.includes('/mail/id/')) {
        console.log('[Ward] Skipping Outlook inbox list view - only analyzing individual messages');
        await chrome.runtime.sendMessage({
          action: 'analyzeContent',
          content: '',
          skipped: true
        });
        return;
      }
      console.log('[Ward] Outlook individual message detected, proceeding with analysis');
    }

    // Yahoo Mail: Skip inbox list views
    if (url.includes('mail.yahoo.com')) {
      // Yahoo message view has /.m/ in the URL path
      // Inbox list is just /d/folders/1 or similar
      if (!url.includes('/.m/')) {
        console.log('[Ward] Skipping Yahoo Mail inbox list view - only analyzing individual messages');
        await chrome.runtime.sendMessage({
          action: 'analyzeContent',
          content: '',
          skipped: true
        });
        return;
      }
      console.log('[Ward] Yahoo Mail individual message detected, proceeding with analysis');
    }

    const content = extractVisibleContent();

    if (!content || content.length < 50) {
      console.log('[Ward] Not enough content to analyze (< 50 chars)');
      return;
    }

    // Skip if content hasn't changed significantly (less than 5% difference)
    if (lastAnalyzedContent && Math.abs(content.length - lastAnalyzedContent.length) < lastAnalyzedContent.length * 0.05) {
      console.log('[Ward] Content unchanged, skipping re-analysis');
      return;
    }

    analysisInProgress = true;
    lastAnalyzedContent = content;

    console.log(`[Ward] Starting analysis of ${content.length} characters...`);
    console.log(`[Ward] Content preview:`, content.substring(0, 200) + '...');
    console.log(`[Ward] FULL CONTENT FOR DEBUGGING:`, content);

    // Send content to background script for analysis
    const response = await chrome.runtime.sendMessage({
      action: 'analyzeContent',
      content: content
    });

    console.log('[Ward] Analysis complete:', {
      isMalicious: response.isMalicious,
      method: response.method,
      contentLength: response.contentLength,
      judgment: response.judgment
    });

    if (response.isMalicious) {
      console.log('[Ward] THREAT DETECTED on this page:', {
        analysis: response.analysis,
        judgment: response.judgment
      });
    } else {
      console.log('[Ward] Page is SAFE - No threats detected');
    }

    // Show warning banner if malicious or timeout
    if (response && (response.isMalicious || response.method === 'timeout')) {
      showWarningBanner(response);
    }

  } catch (error) {
    console.error('[Ward] Failed to analyze page:', error);
  } finally {
    // Always reset the flag so future analyses can run
    analysisInProgress = false;
  }
}

// Run analysis when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', analyzePage);
} else {
  // DOM already loaded
  analyzePage();
}

// Re-analyze if significant DOM changes occur (debounced)
let analysisTimeout;
const observer = new MutationObserver(() => {
  clearTimeout(analysisTimeout);
  analysisTimeout = setTimeout(analyzePage, 2000); // Wait 2 seconds after last change
});

// Start observing after initial load
window.addEventListener('load', () => {
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});
