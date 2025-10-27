// Settings page script

document.addEventListener('DOMContentLoaded', () => {
  const autoScan = document.getElementById('autoScan');
  const showBanner = document.getElementById('showBanner');
  const scanChanges = document.getElementById('scanChanges');
  const useAI = document.getElementById('useAI');
  const useFallback = document.getElementById('useFallback');
  const statusMessage = document.getElementById('statusMessage');

  // Load saved settings
  chrome.storage.sync.get(
    {
      autoScan: true,
      showBanner: true,
      scanChanges: true,
      useAI: true,
      useFallback: true
    },
    (settings) => {
      autoScan.checked = settings.autoScan;
      showBanner.checked = settings.showBanner;
      scanChanges.checked = settings.scanChanges;
      useAI.checked = settings.useAI;
      useFallback.checked = settings.useFallback;
    }
  );

  // Save settings on change
  function saveSettings() {
    const settings = {
      autoScan: autoScan.checked,
      showBanner: showBanner.checked,
      scanChanges: scanChanges.checked,
      useAI: useAI.checked,
      useFallback: useFallback.checked
    };

    chrome.storage.sync.set(settings, () => {
      // Show success message
      statusMessage.textContent = 'Settings saved successfully!';
      statusMessage.className = 'status-message success';

      // Hide after 2 seconds
      setTimeout(() => {
        statusMessage.style.display = 'none';
      }, 2000);
    });
  }

  // Add event listeners
  autoScan.addEventListener('change', saveSettings);
  showBanner.addEventListener('change', saveSettings);
  scanChanges.addEventListener('change', saveSettings);
  useAI.addEventListener('change', saveSettings);
  useFallback.addEventListener('change', saveSettings);
});
