// Popup Script
// Displays the current scan status and analysis results

document.addEventListener('DOMContentLoaded', async () => {
  const statusCard = document.getElementById('statusCard');
  const statusIcon = document.getElementById('statusIcon');
  const statusTitle = document.getElementById('statusTitle');
  const statusDescription = document.getElementById('statusDescription');
  const analysisDetails = document.getElementById('analysisDetails');
  const analysisText = document.getElementById('analysisText');
  const analysisMethod = document.getElementById('analysisMethod');
  const contentLength = document.getElementById('contentLength');
  const rescanBtn = document.getElementById('rescanBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const ignoreActions = document.getElementById('ignoreActions');
  const ignoreUrlBtn = document.getElementById('ignoreUrlBtn');
  const ignoreDomainBtn = document.getElementById('ignoreDomainBtn');

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Load status
  async function loadStatus() {
    try {
      // Get status from storage (where background script stores it)
      const storageKey = `detection_${tab.id}`;
      const data = await chrome.storage.local.get([storageKey]);

      if (data[storageKey] && data[storageKey].result) {
        displayResult(data[storageKey].result);
      } else {
        // No result yet, show scanning state or safe default
        showScanning();
      }
    } catch (error) {
      console.error('Failed to get status:', error);
      showError();
    }
  }

  // Display scanning state
  async function showScanning() {
    statusIcon.className = 'status-icon loading';
    statusIcon.innerHTML = '<div class="spinner"></div>';
    statusTitle.textContent = 'Scanning page...';

    // Get current mode to show appropriate message
    const { detectionMode = 'everyday' } = await chrome.storage.local.get(['detectionMode']);
    const modeMessage = detectionMode === 'everyday'
      ? 'Analyzing content for threats'
      : 'Analyzing content for prompt injection attacks';

    statusDescription.textContent = modeMessage;
    analysisDetails.classList.add('hidden');
  }

  // Display error state
  function showError() {
    statusIcon.className = 'status-icon danger';
    statusIcon.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
    `;
    statusTitle.textContent = 'Unable to scan';
    statusDescription.textContent = 'Could not analyze this page. Try rescanning.';
    analysisDetails.classList.add('hidden');
  }

  // Display result
  function displayResult(result) {
    // Handle skipped cases
    if (result.judgment === 'SKIPPED' || result.method === 'skipped') {
      statusIcon.className = 'status-icon safe';
      statusIcon.innerHTML = `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
      `;
      statusTitle.textContent = 'Scan Skipped';
      statusDescription.textContent = 'This page type is not scanned';

      if (result.analysis) {
        analysisDetails.classList.remove('hidden');
        analysisText.textContent = result.analysis;
        analysisMethod.textContent = 'Skipped';
      }
      return;
    }

    // Handle timeout cases
    if (result.judgment === 'TIMEOUT' || result.method === 'timeout') {
      statusIcon.className = 'status-icon loading';
      statusIcon.innerHTML = `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      `;
      statusTitle.textContent = 'Scan Timed Out';
      statusDescription.textContent = 'Analysis took too long. Prompt API may still be downloading.';

      if (result.analysis) {
        analysisDetails.classList.remove('hidden');
        analysisText.textContent = result.analysis;
        analysisMethod.textContent = 'Timeout';
      }
      return;
    }

    // Handle error cases
    if (result.judgment === 'ERROR' || result.method === 'error') {
      showError();
      if (result.analysis) {
        analysisDetails.classList.remove('hidden');
        analysisText.textContent = result.analysis;
        analysisMethod.textContent = 'Error';
      }
      return;
    }

    if (result.isMalicious) {
      // Malicious content detected
      statusIcon.className = 'status-icon danger';
      statusIcon.innerHTML = `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      `;
      statusTitle.textContent = 'Threat Detected';
      statusDescription.textContent = 'This page contains suspicious content. Exercise caution.';

      // Show ignore options
      ignoreActions.classList.remove('hidden');
    } else {
      // Safe content
      statusIcon.className = 'status-icon safe';
      statusIcon.innerHTML = `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M20 6L9 17l-5-5"></path>
        </svg>
      `;
      statusTitle.textContent = 'Page is Safe';
      statusDescription.textContent = 'No threats detected on this page.';

      // Hide ignore options
      ignoreActions.classList.add('hidden');
    }

    // Show analysis details if available
    if (result.analysis) {
      analysisDetails.classList.remove('hidden');
      analysisText.textContent = result.analysis;

      // Update metadata
      const methodText = result.method === 'ai' ? 'AI-Powered Detection' :
                        result.method === 'timeout' ? 'Timeout' :
                        result.method === 'error' ? 'Error' : 'Pattern Matching';
      analysisMethod.textContent = methodText;

      if (result.contentLength) {
        const kb = (result.contentLength / 1000).toFixed(1);
        contentLength.textContent = `${kb}KB analyzed`;
      }
    } else {
      analysisDetails.classList.add('hidden');
    }
  }

  // Rescan button handler
  rescanBtn.addEventListener('click', async () => {
    showScanning();

    try {
      // Trigger a new scan by reloading the content script logic
      await chrome.tabs.reload(tab.id);
      // Wait a bit for the scan to complete
      setTimeout(loadStatus, 1000);
    } catch (error) {
      console.error('Rescan failed:', error);
      showError();
    }
  });

  // Settings button handler
  settingsBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'settings.html' });
  });

  // Ignore URL button handler
  ignoreUrlBtn.addEventListener('click', async () => {
    const url = tab.url;
    await addIgnoreRule(url, 'url');
    ignoreUrlBtn.textContent = '✓ URL Ignored';
    ignoreUrlBtn.disabled = true;
    setTimeout(() => {
      window.close();
    }, 1000);
  });

  // Ignore Domain button handler
  ignoreDomainBtn.addEventListener('click', async () => {
    try {
      const urlObj = new URL(tab.url);
      const domain = urlObj.hostname;
      await addIgnoreRule(domain, 'domain');
      ignoreDomainBtn.textContent = '✓ Domain Ignored';
      ignoreDomainBtn.disabled = true;
      setTimeout(() => {
        window.close();
      }, 1000);
    } catch (error) {
      console.error('Failed to parse URL:', error);
    }
  });

  // Initial load
  loadStatus();

  // Listen for updates from content script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'updateStatus') {
      displayResult(message.result);
    }
  });
});

// Helper function to add ignore rule
async function addIgnoreRule(pattern, type) {
  const { ignoreRules = [] } = await chrome.storage.local.get(['ignoreRules']);

  // Check if rule already exists
  const exists = ignoreRules.some(rule => rule.pattern === pattern && rule.type === type);
  if (!exists) {
    ignoreRules.push({ pattern, type, addedAt: Date.now() });
    await chrome.storage.local.set({ ignoreRules });
    console.log('[Ward] Added ignore rule:', pattern, type);
  }
}
