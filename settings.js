// Ward Settings

document.addEventListener('DOMContentLoaded', async () => {
  // Load all settings
  const settings = await chrome.storage.local.get([
    'detectionMode',
    'autoScan',
    'showBanner',
    'scanChanges',
    'useAI',
    'ignoreRules'
  ]);

  const detectionMode = settings.detectionMode || 'everyday';
  const ignoreRules = settings.ignoreRules || [];

  // Set mode selector
  document.querySelectorAll('.mode-option').forEach(option => {
    if (option.dataset.mode === detectionMode) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });

  // Set toggles
  document.getElementById('autoScan').checked = settings.autoScan !== false;
  document.getElementById('showBanner').checked = settings.showBanner !== false;
  document.getElementById('scanChanges').checked = settings.scanChanges !== false;
  document.getElementById('useAI').checked = settings.useAI !== false;

  // Render ignore rules
  renderIgnoreRules(ignoreRules);

  // Handle mode selection
  document.querySelectorAll('.mode-option:not(.disabled)').forEach(option => {
    option.addEventListener('click', async () => {
      const mode = option.dataset.mode;

      // Update UI
      document.querySelectorAll('.mode-option').forEach(opt => {
        opt.classList.remove('active');
      });
      option.classList.add('active');

      // Save to storage
      await chrome.storage.local.set({ detectionMode: mode });

      // Show message
      showMessage(`Switched to ${getModeDisplayName(mode)} mode`);

      // Notify background script
      chrome.runtime.sendMessage({ action: 'changeMode', mode });
    });
  });

  // Handle toggle changes
  document.getElementById('autoScan').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ autoScan: e.target.checked });
    showMessage('Settings saved');
  });

  document.getElementById('showBanner').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ showBanner: e.target.checked });
    showMessage('Settings saved');
  });

  document.getElementById('scanChanges').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ scanChanges: e.target.checked });
    showMessage('Settings saved');
  });

  document.getElementById('useAI').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ useAI: e.target.checked });
    showMessage('Settings saved');
  });
});

function renderIgnoreRules(rules) {
  const container = document.getElementById('ignoreList');

  if (rules.length === 0) {
    container.innerHTML = '<div class="empty-state">No ignored URLs or domains</div>';
    return;
  }

  container.innerHTML = rules.map((rule, index) => `
    <div class="ignore-item">
      <div>
        <span class="ignore-url">${escapeHtml(rule.pattern)}</span>
        <span class="ignore-type">(${rule.type})</span>
      </div>
      <button class="remove-btn" data-index="${index}">Remove</button>
    </div>
  `).join('');

  // Add remove handlers
  container.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const index = parseInt(btn.dataset.index);
      await removeIgnoreRule(index);
    });
  });
}

async function removeIgnoreRule(index) {
  const { ignoreRules = [] } = await chrome.storage.local.get(['ignoreRules']);
  ignoreRules.splice(index, 1);
  await chrome.storage.local.set({ ignoreRules });
  renderIgnoreRules(ignoreRules);
  showMessage('Ignore rule removed');
}

function getModeDisplayName(mode) {
  const names = {
    'everyday': 'Everyday',
    'ai-power-user': 'AI Power User',
    'enterprise': 'Enterprise'
  };
  return names[mode] || mode;
}

function showMessage(text) {
  const msg = document.getElementById('statusMessage');
  msg.textContent = text;
  msg.classList.add('success');

  setTimeout(() => {
    msg.classList.remove('success');
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
