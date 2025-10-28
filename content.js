// NoInject Content Script
// Extracts visible page content and sends it for analysis

console.log('[NoInject] Content script loaded and running');

// Extract all visible text content from the page
function extractVisibleContent() {
  // Get all text from the body, excluding scripts, styles, and hidden elements
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Skip if parent is script, style, or noscript
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        const tagName = parent.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'iframe'].includes(tagName)) {
          return NodeFilter.FILTER_REJECT;
        }

        // Skip if element is hidden
        const style = window.getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          return NodeFilter.FILTER_REJECT;
        }

        // Skip if text is empty or just whitespace
        if (!node.textContent.trim()) {
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

  // Also check input fields, textareas for placeholder text and values
  const inputs = document.querySelectorAll('input[type="text"], input[type="search"], textarea');
  inputs.forEach(input => {
    if (input.placeholder) {
      textContent.push(input.placeholder);
    }
    if (input.value) {
      textContent.push(input.value);
    }
  });

  // Join all text with spaces and clean up
  let fullText = textContent.join(' ');

  // Clean up excessive whitespace
  fullText = fullText.replace(/\s+/g, ' ').trim();

  return fullText;
}

// Show warning banner if malicious content detected
function showWarningBanner(analysisResult) {
  // Check if banner already exists
  if (document.getElementById('noinject-warning-banner')) {
    return;
  }

  // Parse the AI analysis to extract specific findings
  const analysis = analysisResult.analysis || '';

  // Split analysis into sentences or key points
  const findings = analysis
    .split(/[.!]\s+/)
    .filter(sentence => sentence.trim().length > 20)
    .slice(0, 3)
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
  banner.id = 'noinject-warning-banner';
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
                Prompt Injection Detected
              </div>
              <div style="font-size: 13px; opacity: 0.95;">
                This page contains suspicious content that may attempt to manipulate AI systems. Exercise caution when using AI tools on this site.
              </div>
            </div>
            <button id="noinject-close-banner" style="
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
      #noinject-warning-banner::-webkit-scrollbar {
        width: 8px;
      }
      #noinject-warning-banner::-webkit-scrollbar-track {
        background: rgba(0,0,0,0.1);
        border-radius: 4px;
      }
      #noinject-warning-banner::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.3);
        border-radius: 4px;
      }
      #noinject-warning-banner::-webkit-scrollbar-thumb:hover {
        background: rgba(255,255,255,0.4);
      }
    </style>
  `;

  document.body.appendChild(banner);

  // Add close button handler
  document.getElementById('noinject-close-banner').addEventListener('click', () => {
    banner.remove();
  });
}

// Analyze page content when loaded
async function analyzePage() {
  try {
    const content = extractVisibleContent();

    if (!content || content.length < 50) {
      console.log('[NoInject] Not enough content to analyze (< 50 chars)');
      return;
    }

    console.log(`[NoInject] Starting analysis of ${content.length} characters...`);
    console.log(`[NoInject] Content preview:`, content.substring(0, 200) + '...');
    console.log(`[NoInject] FULL CONTENT FOR DEBUGGING:`, content);

    // Send content to background script for analysis
    const response = await chrome.runtime.sendMessage({
      action: 'analyzeContent',
      content: content
    });

    console.log('[NoInject] Analysis complete:', {
      isMalicious: response.isMalicious,
      method: response.method,
      contentLength: response.contentLength,
      judgment: response.judgment
    });

    if (response.isMalicious) {
      console.log('[NoInject] THREAT DETECTED on this page:', {
        analysis: response.analysis,
        judgment: response.judgment
      });
    } else {
      console.log('[NoInject] Page is SAFE - No threats detected');
    }

    // Show warning banner if malicious
    if (response && response.isMalicious) {
      showWarningBanner(response);
    }

  } catch (error) {
    console.error('[NoInject] Failed to analyze page:', error);
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
