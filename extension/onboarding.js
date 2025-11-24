// Ward Onboarding Script

// Screen navigation
const screens = ['screen1', 'screen2', 'screen3'];
let currentScreen = 0;

function showScreen(index) {
  screens.forEach((screenId, i) => {
    const screen = document.getElementById(screenId);
    if (i === index) {
      screen.classList.remove('hidden');
    } else {
      screen.classList.add('hidden');
    }
  });
}

// Handle Next button (Screen 1 → Screen 2)
document.getElementById('nextBtn1').addEventListener('click', () => {
  currentScreen = 1;
  showScreen(currentScreen);
});

// Handle Next button (Screen 2 → Screen 3)
document.getElementById('nextBtn2').addEventListener('click', () => {
  currentScreen = 2;
  showScreen(currentScreen);
});

// Handle Get Started button (Screen 3)
document.getElementById('getStartedBtn').addEventListener('click', async () => {
  // Set Cloud Mode as default and mark onboarding complete
  await chrome.storage.local.set({
    activeMode: 'cloud',
    cloudConsent: true,
    cloudConsentDate: Date.now(),
    onboardingCompleted: true
  });

  // Tell background script to initialize cloud mode
  chrome.runtime.sendMessage({
    action: 'setMode',
    mode: 'cloud'
  }, () => {
    // Close onboarding
    window.close();
  });
});

// Handle Settings link click
document.getElementById('settingsLink').addEventListener('click', (e) => {
  e.preventDefault();
  // Open settings page
  chrome.tabs.create({ url: 'settings.html' });
});
