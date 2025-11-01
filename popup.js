// Popup Script
// Displays the current scan status and analysis results

document.addEventListener('DOMContentLoaded', async () => {
  const statusCard = document.getElementById('statusCard');
  const statusIcon = document.getElementById('statusIcon');
  const statusTitle = document.getElementById('statusTitle');
  const statusDescription = document.getElementById('statusDescription');
  const analysisDetails = document.getElementById('analysisDetails');
  const analysisText = document.getElementById('analysisText');
  const rescanBtn = document.getElementById('rescanBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const ignoreUrlBtn = document.getElementById('ignoreUrlBtn');
  const ignoreDomainBtn = document.getElementById('ignoreDomainBtn');
  const unsupportedBanner = document.getElementById('unsupportedBanner');

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Check if AI is available
  try {
    const response = await chrome.runtime.sendMessage({ action: 'checkAiAvailability' });
    if (response && !response.available) {
      // Show unsupported banner
      unsupportedBanner.classList.remove('hidden');
      // Hide status card since AI is not working
      statusCard.style.display = 'none';
    }
  } catch (error) {
    console.error('[Ward Popup] Failed to check AI availability:', error);
  }

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
  function showScanning() {
    statusIcon.className = 'status-icon loading';
    statusIcon.innerHTML = '<div class="spinner"></div>';
    statusTitle.textContent = 'Scanning page...';
    statusDescription.textContent = 'Analyzing content for threats';
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
      statusTitle.textContent = 'Page skipped';
      statusDescription.textContent = 'This page type is not scanned';

      if (result.analysis) {
        analysisDetails.classList.remove('hidden');
        analysisText.textContent = result.analysis;
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
      }
      return;
    }

    // Handle error cases
    if (result.judgment === 'ERROR' || result.method === 'error') {
      showError();
      if (result.analysis) {
        analysisDetails.classList.remove('hidden');
        analysisText.textContent = result.analysis;
      }
      return;
    }

    if (result.isMalicious) {
      // Malicious content detected - parse structured judgment
      const fullJudgment = result.judgment || result.analysis || 'Suspicious content detected.';

      // Parse the structured judgment
      const lines = fullJudgment.split('\n').filter(line => line.trim());
      let summary = 'Suspicious content detected.';
      let details = [];
      let recommendation = '';

      if (lines.length > 1) {
        const startIndex = lines[0].toUpperCase().includes('THREAT') ? 1 : 0;

        if (lines[startIndex]) {
          summary = lines[startIndex].trim();
        }

        // The last line is ALWAYS the recommendation to show (keep ** formatting)
        if (lines.length > 0) {
          recommendation = lines[lines.length - 1].trim();
        }

        // Collect bullet points (lines starting with * but not the last line)
        for (let i = startIndex + 1; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line.startsWith('*') && !line.startsWith('**')) {
            details.push(line.substring(1).trim());
          }
        }
      }

      statusIcon.className = 'status-icon danger';
      statusIcon.innerHTML = `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      `;
      statusTitle.textContent = 'Threat Detected';
      // Format bold text in summary with ** markers
      const formattedSummary = summary.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      statusDescription.innerHTML = formattedSummary;

      // Show analysis details with structured format
      analysisDetails.classList.remove('hidden');

      // Parse out bold text from recommendation for prominent display
      let boldAction = '';
      let fullRecommendation = '';

      if (recommendation) {
        const boldMatch = recommendation.match(/\*\*([^*]+)\*\*/);
        if (boldMatch) {
          boldAction = boldMatch[1];
          fullRecommendation = recommendation;
        } else {
          boldAction = 'Exercise caution when interacting with this content.';
          fullRecommendation = recommendation;
        }
      } else {
        boldAction = 'Exercise caution when interacting with this content.';
        fullRecommendation = 'Exercise caution when interacting with this content.';
      }

      // Display prominent action box with info button
      analysisText.innerHTML = `
        <div class="action-box">
          <div class="action-text">${boldAction}</div>
          <button class="info-btn" title="More details">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </button>
        </div>
        <div class="full-recommendation">${fullRecommendation.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</div>
      `;

      // Populate expanded details section
      const expandedDetails = document.getElementById('expandedDetails');
      const redFlagsSection = document.getElementById('redFlagsSection');
      const fullRecommendationSection = document.getElementById('fullRecommendationSection');

      // Add red flags if available
      if (details.length > 0) {
        redFlagsSection.innerHTML = '<h4>🚩 Red Flags</h4><ul>' +
          details.map(detail => `<li>${detail.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</li>`).join('') +
          '</ul>';
      } else {
        redFlagsSection.innerHTML = '';
      }

      // Add full recommendation to expanded section
      if (fullRecommendation) {
        const formattedFullRec = fullRecommendation.trim().replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        fullRecommendationSection.innerHTML = `<h4>💡 Summary</h4><div class="recommendation-text">${formattedFullRec}</div>`;
      } else {
        fullRecommendationSection.innerHTML = '';
      }

      // Make entire recommendation box clickable to toggle accordion
      analysisText.onclick = () => {
        expandedDetails.classList.toggle('open');
      };

      // Show ignore buttons
      ignoreUrlBtn.classList.remove('hidden');
      ignoreDomainBtn.classList.remove('hidden');
    } else {
      // Safe content
      statusIcon.className = 'status-icon safe';
      statusIcon.innerHTML = `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M20 6L9 17l-5-5"></path>
        </svg>U
      `;
      statusTitle.textContent = 'Page appears okay';
      statusDescription.textContent = 'Use normal caution, as Ward cannot detect every threat.';

      // Hide analysis for safe content
      analysisDetails.classList.add('hidden');

      // Hide ignore buttons
      ignoreUrlBtn.classList.add('hidden');
      ignoreDomainBtn.classList.add('hidden');
    }
  }

  // Rescan button handler
  rescanBtn.addEventListener('click', async () => {
    showScanning();

    try {
      // Clear cached results for this tab
      await chrome.runtime.sendMessage({
        action: 'clearTabCache',
        tabId: tab.id
      });

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

  // Track current URL to detect navigation
  let lastUrl = tab.url;
  let lastStorageState = null;

  // Poll for status updates while popup is open
  const statusCheckInterval = setInterval(async () => {
    try {
      // Get current tab info to check for URL changes
      const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // If URL changed, show scanning state
      if (currentTab.url !== lastUrl) {
        lastUrl = currentTab.url;
        lastStorageState = null;
        showScanning();
      }

      const storageKey = `detection_${currentTab.id}`;
      const data = await chrome.storage.local.get([storageKey]);

      // If storage was cleared (navigation), show scanning
      if (lastStorageState && !data[storageKey]) {
        lastStorageState = null;
        showScanning();
      } else if (data[storageKey] && data[storageKey].result) {
        lastStorageState = data[storageKey];
        displayResult(data[storageKey].result);
      }
    } catch (error) {
      console.error('Failed to check status:', error);
    }
  }, 500); // Check every 500ms

  // Clean up interval when popup closes
  window.addEventListener('unload', () => {
    clearInterval(statusCheckInterval);
  });

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
