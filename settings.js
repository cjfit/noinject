// Ward Settings

document.addEventListener('DOMContentLoaded', async () => {
  // Check auth status
  checkAuthStatus();

  // Load all settings
  const settings = await chrome.storage.local.get([
    'autoScan',
    'showBanner',
    'scanChanges',
    'ignoreRules'
  ]);

  const ignoreRules = settings.ignoreRules || [];

  // Set toggles
  document.getElementById('autoScan').checked = settings.autoScan !== false;
  document.getElementById('showBanner').checked = settings.showBanner !== false;
  document.getElementById('scanChanges').checked = settings.scanChanges !== false;

  // Render ignore rules
  renderIgnoreRules(ignoreRules);

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

// Check if user is signed in to Chrome
async function checkAuthStatus() {
  chrome.identity.getProfileUserInfo((userInfo) => {
    const authStatus = document.getElementById('authStatus');
    const signInPrompt = document.getElementById('signInPrompt');
    const promptTitle = signInPrompt.querySelector('h2');
    const promptText = signInPrompt.querySelector('p');

    if (userInfo.email) {
      // User is signed in
      promptTitle.textContent = "You're signed in";
      promptText.textContent = "Ward is associated with your Google account";
      authStatus.innerHTML = `<span style="color: #059669; font-size: 13px;">✓ ${escapeHtml(userInfo.email)}</span>`;
      // Send email to server
      sendEmailToServer(userInfo.email);
    } else {
      // User not signed in
      promptTitle.textContent = "Sign in to sync";
      promptText.textContent = "Associate Ward with your Google account for extra features";
      authStatus.innerHTML = `<span style="color: #6B7280; font-size: 13px;">Not signed in to Chrome</span>`;
    }
  });
}

// Send email to server for account creation
async function sendEmailToServer(email) {
  // Store locally
  await chrome.storage.local.set({ userEmail: email, syncedAt: Date.now() });

  // right now this does nothing.
  // TODO: Send to your server
  // fetch('https://your-server.com/api/users', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email })
  // });

  console.log('[Ward Auth] User email:', email);
}
