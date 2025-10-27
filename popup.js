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

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Load status
  async function loadStatus() {
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });

      if (response && response.result) {
        displayResult(response.result);
      } else {
        // No result yet, show scanning state
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
    statusDescription.textContent = 'Analyzing content for prompt injection attacks';
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
      statusTitle.textContent = 'Prompt Injection Detected';
      statusDescription.textContent = 'This page contains suspicious content that may manipulate AI systems.';
    } else {
      // Safe content
      statusIcon.className = 'status-icon safe';
      statusIcon.innerHTML = `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M20 6L9 17l-5-5"></path>
        </svg>
      `;
      statusTitle.textContent = 'Page is Safe';
      statusDescription.textContent = 'No prompt injection attacks detected on this page.';
    }

    // Show analysis details if available
    if (result.analysis) {
      analysisDetails.classList.remove('hidden');
      analysisText.textContent = result.analysis;

      // Update metadata
      const methodText = result.method === 'ai' ? 'AI-Powered Detection' : 'Pattern Matching';
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

  // Settings button handler (placeholder)
  settingsBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'settings.html' });
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
