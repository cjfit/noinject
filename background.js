// Ward Background Service Worker
// Handles AI-powered threat detection using Chrome's Prompt API

import { initializeEverydayMode, analyzeEveryday } from './modes/everyday/detector.js';

console.log('[Ward] Background script starting...');
console.log('[Ward] Imports check:', {
  hasInitializeEverydayMode: typeof initializeEverydayMode === 'function',
  hasAnalyzeEveryday: typeof analyzeEveryday === 'function'
});

let everydaySessions = { analyzerSession: null, judgeSession: null };
let isAiAvailable = false;
const DETECTION_CACHE = new Map(); // Cache results per URL
const ACTIVE_ANALYSES = new Map(); // Track ongoing analyses by tabId
const SCANNING_ANIMATIONS = new Map(); // Track scanning animations by tabId

// Generate cache key - always include tabId for proper isolation
function getCacheKey(url, content, tabId) {
  const contentHash = content.substring(0, 500);
  return `tab${tabId}:${url}:${contentHash}`;
}

// Initialize AI
async function initializeAI() {
  try {
    console.log('[Ward] Initializing everyday mode...');

    if (typeof initializeEverydayMode !== 'function') {
      console.error('[Ward] ERROR: initializeEverydayMode is not a function!');
      isAiAvailable = false;
      return;
    }

    try {
      console.log('[Ward] About to call initializeEverydayMode...');
      everydaySessions = await initializeEverydayMode();
      console.log('[Ward] initializeEverydayMode call completed');
      console.log('[Ward] initializeEverydayMode returned:', {
        hasAnalyzer: !!everydaySessions?.analyzerSession,
        hasJudge: !!everydaySessions?.judgeSession,
        rawResult: everydaySessions
      });
      isAiAvailable = everydaySessions.analyzerSession !== null && everydaySessions.judgeSession !== null;
      console.log('[Ward] Everyday mode sessions:', everydaySessions.analyzerSession ? 'Created' : 'Failed');
      console.log('[Ward] isAiAvailable:', isAiAvailable);
    } catch (everydayInitError) {
      console.error('[Ward] ERROR calling initializeEverydayMode:', everydayInitError);
      console.error('[Ward] Error stack:', everydayInitError.stack);
      isAiAvailable = false;
    }

    if (isAiAvailable) {
      console.log('[Ward] ✓ Everyday mode initialized successfully and ready');
    } else {
      console.warn('[Ward] ✗ Failed to initialize everyday mode - AI will not be available');
    }

  } catch (error) {
    console.error('[Ward] Failed to initialize AI:', error);
    isAiAvailable = false;
  }
}

// Analyze content
async function analyzeContent(content, url = 'unknown') {
  if (!isAiAvailable) {
    console.error('[Ward] AI not available - cannot analyze');
    return {
      isMalicious: false,
      analysis: 'AI detection unavailable. Please enable Prompt API in chrome://flags.',
      judgment: 'ERROR',
      method: 'error',
      mode: 'everyday',
      contentLength: content.length
    };
  }

  try {
    console.log('[Ward] Running analysis in everyday mode');
    console.log('[Ward] Passing to analyzeEveryday:', {
      hasAnalyzer: !!everydaySessions.analyzerSession,
      hasJudge: !!everydaySessions.judgeSession,
      contentLength: content.length,
      url: url
    });
    const result = await analyzeEveryday(
      everydaySessions.analyzerSession,
      everydaySessions.judgeSession,
      content,
      url
    );
    console.log('[Ward] analyzeEveryday returned:', result);
    return result;
  } catch (error) {
    console.error('[Ward] Analysis error:', error);
    return {
      isMalicious: false,
      analysis: `Analysis error: ${error.message}`,
      judgment: 'ERROR',
      method: 'error',
      mode: 'everyday',
      contentLength: content.length
    };
  }
}

// Check if URL should be ignored
async function shouldIgnoreUrl(url) {
  try {
    // Always ignore extension's own pages
    if (url.includes('chrome-extension://') && (url.includes('/settings.html') || url.includes('/popup.html'))) {
      console.log('[Ward] Ignoring extension internal page');
      return true;
    }

    const { ignoreRules = [] } = await chrome.storage.local.get(['ignoreRules']);

    for (const rule of ignoreRules) {
      if (rule.type === 'url' && url === rule.pattern) {
        console.log('[Ward] Ignoring URL (exact match):', url);
        return true;
      }
      if (rule.type === 'domain') {
        const urlObj = new URL(url);
        if (urlObj.hostname === rule.pattern) {
          console.log('[Ward] Ignoring domain:', rule.pattern);
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    console.error('[Ward] Error checking ignore rules:', error);
    return false;
  }
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeContent') {
    const content = request.content;
    const url = sender.tab?.url || 'unknown';

    // Check if content script marked this as skipped
    if (request.skipped) {
      console.log('[Ward] Content script skipped analysis for:', url);
      const skipResult = {
        isMalicious: false,
        analysis: 'Page scanning skipped (email platform interface)',
        judgment: 'SKIPPED',
        method: 'skipped',
        mode: 'everyday',
        contentLength: 0
      };

      // Store result so popup shows proper status
      chrome.storage.local.set({
        [`detection_${sender.tab.id}`]: {
          result: skipResult,
          url: sender.tab.url,
          timestamp: Date.now()
        }
      });

      // Stop scanning animation
      stopScanningAnimation(sender.tab.id);

      updateBadge(sender.tab.id, false);
      sendResponse(skipResult);
      return;
    }

    // Check if URL should be ignored
    shouldIgnoreUrl(url).then(ignored => {
      if (ignored) {
        console.log('[Ward] Skipping analysis for ignored URL:', url);
        const ignoreResult = {
          isMalicious: false,
          analysis: 'This page is ignored and will not be scanned.',
          judgment: 'IGNORED',
          method: 'ignored',
          mode: 'everyday',
          contentLength: content.length
        };

        // Store result so popup shows proper status
        chrome.storage.local.set({
          [`detection_${sender.tab.id}`]: {
            result: ignoreResult,
            url: sender.tab.url,
            timestamp: Date.now()
          }
        });

        updateBadge(sender.tab.id, false);
        sendResponse(ignoreResult);
        return;
      }

      // Check cache first (using URL + content hash + tabId as key)
      const cacheKey = getCacheKey(url, content, sender.tab.id);
      if (DETECTION_CACHE.has(cacheKey)) {
        const cached = DETECTION_CACHE.get(cacheKey);
        console.log('[Ward] Returning cached result for URL:', url);

        // Store cached result so popup shows proper status
        chrome.storage.local.set({
          [`detection_${sender.tab.id}`]: {
            result: cached,
            url: sender.tab.url,
            timestamp: Date.now()
          }
        });

        sendResponse(cached);
        updateBadge(sender.tab.id, cached.isMalicious);
        return;
      }

      // Cancel any existing analysis for this tab
      const tabId = sender.tab.id;
      if (ACTIVE_ANALYSES.has(tabId)) {
        console.log(`[Ward] Cancelling previous analysis for tab ${tabId}`);
        const previousAnalysis = ACTIVE_ANALYSES.get(tabId);
        previousAnalysis.cancelled = true;
        clearTimeout(previousAnalysis.timeout);
      }

      console.log('[Ward] Starting fresh analysis (not cached) for URL:', url);

      // Start animated scanning icon
      startScanningAnimation(sender.tab.id);

      // Create cancellable analysis tracker
      const analysisTracker = {
        cancelled: false,
        timeout: null,
        startTime: Date.now()
      };
      ACTIVE_ANALYSES.set(tabId, analysisTracker);

      // Analyze the content with overall timeout
      analysisTracker.timeout = setTimeout(() => {
        if (analysisTracker.cancelled) return;

        console.error('[Ward] Overall analysis timeout - taking too long');
        ACTIVE_ANALYSES.delete(tabId);
        sendResponse({
          error: 'Analysis timeout',
          isMalicious: false,
          analysis: 'Unable to scan. Proceed with caution.',
          judgment: 'Unable to scan. Proceed with caution.',
          method: 'timeout',
          mode: 'everyday',
          contentLength: content.length
        });
      }, 60000); // 60 second overall timeout

      analyzeContent(content, url).then(result => {
        // Check if analysis was cancelled while running
        if (analysisTracker.cancelled) {
          console.log(`[Ward] Analysis cancelled for tab ${tabId}, discarding results`);
          return;
        }

        clearTimeout(analysisTracker.timeout);
        ACTIVE_ANALYSES.delete(tabId);
        const duration = Date.now() - analysisTracker.startTime;
        console.log(`[Ward] Analysis completed in ${duration}ms`);

        // Verify tab still exists and is on same URL before storing results
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError) {
            console.log(`[Ward] Tab ${tabId} no longer exists, discarding results`);
            return;
          }

          if (tab.url !== url) {
            console.log(`[Ward] Tab ${tabId} navigated away (${url} -> ${tab.url}), discarding results`);
            return;
          }

          // Stop scanning animation
          stopScanningAnimation(tabId);

          // Cache the result
          DETECTION_CACHE.set(cacheKey, result);

          // Update badge based on result
          updateBadge(tabId, result.isMalicious);

          // Store detection result for this tab
          chrome.storage.local.set({
            [`detection_${tabId}`]: {
              result,
              url: tab.url,
              timestamp: Date.now()
            }
          });

          sendResponse(result);
        });
      }).catch(error => {
        if (analysisTracker.cancelled) {
          console.log(`[Ward] Analysis cancelled for tab ${tabId}, ignoring error`);
          return;
        }

        clearTimeout(analysisTracker.timeout);
        ACTIVE_ANALYSES.delete(tabId);

        // Stop scanning animation on error
        stopScanningAnimation(tabId);

        console.error('[Ward] Analysis error:', error);
        sendResponse({
          error: error.message,
          isMalicious: false,
          analysis: error.message.includes('timeout')
            ? 'Unable to scan. Proceed with caution.'
            : 'Analysis failed, defaulting to safe',
          judgment: error.message.includes('timeout')
            ? 'Unable to scan. Proceed with caution.'
            : 'ERROR',
          method: error.message.includes('timeout') ? 'timeout' : 'error',
          mode: 'everyday',
          contentLength: content.length
        });
      });
    });

    return true; // Will respond asynchronously
  }

  if (request.action === 'getStatus') {
    chrome.storage.local.get([`detection_${sender.tab.id}`], (data) => {
      const detection = data[`detection_${sender.tab.id}`];
      sendResponse(detection || { result: { isMalicious: false, analysis: 'No scan performed yet' } });
    });
    return true;
  }


  // Handle clearing cache for a specific tab (e.g., when rescan is clicked)
  if (request.action === 'clearTabCache') {
    const tabId = request.tabId;
    console.log(`[Ward] Clearing cache for tab ${tabId}`);

    // Remove all cache entries for this tab
    const keysToDelete = [];
    for (const key of DETECTION_CACHE.keys()) {
      if (key.startsWith(`tab${tabId}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => DETECTION_CACHE.delete(key));

    console.log(`[Ward] Cleared ${keysToDelete.length} cache entries for tab ${tabId}`);
    sendResponse({ success: true, clearedCount: keysToDelete.length });
    return true;
  }

  // Handle request to open threat popup window
  if (request.action === 'openThreatPopup') {
    // Get the current tab's detection data
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        const tabId = tabs[0].id;
        const data = await chrome.storage.local.get([`detection_${tabId}`]);
        const detection = data[`detection_${tabId}`];

        if (detection && detection.result && detection.result.isMalicious) {
          // Parse judgment to extract structured data
          const fullJudgment = detection.result.judgment || detection.result.analysis || '';
          const lines = fullJudgment.split('\n').filter(line => line.trim());
          let summary = 'Suspicious content detected.';
          let details = [];
          let recommendation = '';

          if (lines.length > 1) {
            const startIndex = lines[0].toUpperCase().includes('THREAT') ? 1 : 0;
            if (lines[startIndex]) {
              summary = lines[startIndex].trim();
            }

            let recommendationStarted = false;
            for (let i = startIndex + 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (line.includes('**')) {
                recommendationStarted = true;
                recommendation += line + ' ';
              } else if (recommendationStarted) {
                recommendation += line + ' ';
              } else if (line.startsWith('*')) {
                details.push(line.substring(1).trim());
              }
            }
          }

          const analysisData = {
            summary: summary,
            details: details,
            recommendation: recommendation,
            method: detection.result.method,
            contentLength: detection.result.contentLength,
            url: detection.url,
            timestamp: detection.timestamp
          };

          const dataStr = encodeURIComponent(JSON.stringify(analysisData));

          // Create a popup window - professional looking browser window
          chrome.windows.create({
            url: `alert.html?data=${dataStr}`,
            type: 'popup',
            width: 600,
            height: 550,
            focused: true
          });
        }
      }
    });

    sendResponse({ success: true });
    return true;
  }

  // Handle request to open details page
  if (request.action === 'openDetailsPage') {
    // Get the current tab's detection data
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        const tabId = tabs[0].id;
        const data = await chrome.storage.local.get([`detection_${tabId}`]);
        const detection = data[`detection_${tabId}`];

        if (detection && detection.result && detection.result.isMalicious) {
          // Parse judgment to extract structured data
          const fullJudgment = detection.result.judgment || detection.result.analysis || '';
          const lines = fullJudgment.split('\n').filter(line => line.trim());
          let summary = 'Suspicious content detected.';
          let details = [];
          let recommendation = '';

          if (lines.length > 1) {
            const startIndex = lines[0].toUpperCase().includes('THREAT') ? 1 : 0;
            if (lines[startIndex]) {
              summary = lines[startIndex].trim();
            }

            let recommendationStarted = false;
            for (let i = startIndex + 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (line.includes('**')) {
                recommendationStarted = true;
                recommendation += line + ' ';
              } else if (recommendationStarted) {
                recommendation += line + ' ';
              } else if (line.startsWith('*')) {
                details.push(line.substring(1).trim());
              }
            }
          }

          const analysisData = {
            summary: summary,
            details: details,
            recommendation: recommendation,
            method: detection.result.method,
            contentLength: detection.result.contentLength,
            url: detection.url,
            timestamp: detection.timestamp
          };

          const dataStr = encodeURIComponent(JSON.stringify(analysisData));
          chrome.tabs.create({ url: `details.html?data=${dataStr}` });
        }
      }
    });

    sendResponse({ success: true });
    return true;
  }
});

// Update extension badge
function updateBadge(tabId, isMalicious) {
  if (isMalicious) {
    chrome.action.setBadgeText({ text: '!', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#DC2626', tabId }); // Red
    chrome.action.setIcon({
      tabId,
      path: {
        16: 'icons/icon-danger-16.png',
        32: 'icons/icon-danger-32.png',
        48: 'icons/icon-danger-48.png',
        128: 'icons/icon-danger-128.png'
      }
    });
  } else {
    chrome.action.setBadgeText({ text: '', tabId });
    chrome.action.setIcon({
      tabId,
      path: {
        16: 'icons/icon-safe-16.png',
        32: 'icons/icon-safe-32.png',
        48: 'icons/icon-safe-48.png',
        128: 'icons/icon-safe-128.png'
      }
    });
  }
}

// Clean up old detection results from storage periodically
setInterval(async () => {
  // Clean up cache if it gets too large
  if (DETECTION_CACHE.size > 100) {
    DETECTION_CACHE.clear();
  }

  // Clean up old detection results from storage (older than 1 hour)
  const allStorage = await chrome.storage.local.get(null);
  const now = Date.now();
  const keysToRemove = [];

  for (const [key, value] of Object.entries(allStorage)) {
    if (key.startsWith('detection_') &&
        value.timestamp &&
        now - value.timestamp > 3600000) {
      keysToRemove.push(key);
    }
  }

  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
    console.log(`[Ward] Cleaned up ${keysToRemove.length} old detection results`);
  }
}, 300000); // Every 5 minutes

// Clean up tab state when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  console.log(`[Ward] Tab ${tabId} closed, cleaning up state`);

  // Cancel any ongoing analysis
  if (ACTIVE_ANALYSES.has(tabId)) {
    const analysis = ACTIVE_ANALYSES.get(tabId);
    analysis.cancelled = true;
    clearTimeout(analysis.timeout);
    ACTIVE_ANALYSES.delete(tabId);
  }

  // Stop any scanning animation
  stopScanningAnimation(tabId);

  // Remove detection result from storage
  chrome.storage.local.remove([`detection_${tabId}`]);

  // Clean up tab-specific cache entries
  const keysToDelete = [];
  for (const key of DETECTION_CACHE.keys()) {
    if (key.startsWith(`tab${tabId}:`)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => DETECTION_CACHE.delete(key));

  if (keysToDelete.length > 0) {
    console.log(`[Ward] Removed ${keysToDelete.length} cache entries for tab ${tabId}`);
  }
});

// Clear stored tab state when navigating to a new page (but keep DETECTION_CACHE)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Trigger on any loading event, whether URL changed or not
  if (changeInfo.status === 'loading') {
    // Skip chrome:// pages and extension pages
    if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://'))) {
      console.log('[Ward] Skipping chrome:// or extension page:', tab.url);

      // Store a SKIPPED result so popup shows "Page skipped" instead of "Scanning..."
      const skippedResult = {
        result: {
          judgment: 'SKIPPED',
          method: 'skipped',
          isMalicious: false,
          analysis: 'System pages and extension pages are not scanned.'
        },
        timestamp: Date.now()
      };
      chrome.storage.local.set({ [`detection_${tabId}`]: skippedResult });

      // Set icon to neutral state
      chrome.action.setIcon({
        tabId: tabId,
        path: {
          16: 'icons/icon-safe-16.png',
          32: 'icons/icon-safe-32.png',
          48: 'icons/icon-safe-48.png',
          128: 'icons/icon-safe-128.png'
        }
      });

      return;
    }

    console.log('[Ward] Page loading detected:', tab.url);

    // Cancel any ongoing analysis for this tab
    if (ACTIVE_ANALYSES.has(tabId)) {
      console.log(`[Ward] Cancelling ongoing analysis for tab ${tabId} due to navigation`);
      const analysis = ACTIVE_ANALYSES.get(tabId);
      analysis.cancelled = true;
      clearTimeout(analysis.timeout);
      ACTIVE_ANALYSES.delete(tabId);
    }

    // Clear stored detection result for this tab so popup shows "Scanning..." state
    chrome.storage.local.remove([`detection_${tabId}`]);

    // Start scanning animation immediately to show loading state
    startScanningAnimation(tabId);

    console.log('[Ward] Cleared tab state for navigation and started scanning animation');
    // Note: DETECTION_CACHE is preserved so revisiting pages uses cached results
  }
});

// Create scanning animation with moving magnifying glass
function startScanningAnimation(tabId) {
  // Stop any existing animation for this tab
  stopScanningAnimation(tabId);

  let frame = 0;
  const totalFrames = 8;

  const animationInterval = setInterval(() => {
    const canvas = new OffscreenCanvas(128, 128);
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, 128, 128);

    // Calculate magnifying glass position (moves in a circle)
    const angle = (frame / totalFrames) * Math.PI * 2;
    const radius = 15;
    const centerX = 64 + Math.cos(angle) * radius;
    const centerY = 64 + Math.sin(angle) * radius;

    // Draw magnifying glass
    // Glass circle (outer)
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Inner circle (lens reflection)
    ctx.beginPath();
    ctx.arc(centerX, centerY, 22, 0, Math.PI * 2);
    ctx.strokeStyle = '#60A5FA';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Handle
    const handleAngle = angle + Math.PI * 0.75;
    const handleLength = 30;
    const handleX = centerX + Math.cos(handleAngle) * handleLength;
    const handleY = centerY + Math.sin(handleAngle) * handleLength;

    ctx.beginPath();
    ctx.moveTo(centerX + Math.cos(handleAngle) * 25, centerY + Math.sin(handleAngle) * 25);
    ctx.lineTo(handleX, handleY);
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Set the icon
    const imageData = ctx.getImageData(0, 0, 128, 128);
    chrome.action.setIcon({ tabId, imageData });

    frame = (frame + 1) % totalFrames;
  }, 150); // Update every 150ms

  SCANNING_ANIMATIONS.set(tabId, animationInterval);
}

function stopScanningAnimation(tabId) {
  const animationInterval = SCANNING_ANIMATIONS.get(tabId);
  if (animationInterval) {
    clearInterval(animationInterval);
    SCANNING_ANIMATIONS.delete(tabId);

    // Reset to default safe icon
    chrome.action.setIcon({
      tabId,
      path: {
        16: 'icons/icon-safe-16.png',
        32: 'icons/icon-safe-32.png',
        48: 'icons/icon-safe-48.png',
        128: 'icons/icon-safe-128.png'
      }
    });
  }
}

// Initialize AI when extension starts
initializeAI();
