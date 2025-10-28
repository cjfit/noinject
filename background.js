// Ward Background Service Worker
// Handles AI-powered threat detection using Chrome's Prompt API

import { initializeEverydayMode, analyzeEveryday } from './modes/everyday/detector.js';
import { initializeAIPowerUserMode, analyzeAIPowerUser } from './modes/ai-power-user/detector.js';

console.log('[Ward] Background script starting...');

let currentMode = 'everyday'; // Default mode
let everydaySession = null;
let aiPowerUserSessions = { aiSession: null, judgeSession: null };
let isAiAvailable = false;
const DETECTION_CACHE = new Map(); // Cache results per URL

// Initialize AI based on current mode
async function initializeAI() {
  try {
    // Load saved mode from storage
    const { detectionMode = 'everyday' } = await chrome.storage.local.get(['detectionMode']);
    currentMode = detectionMode;

    console.log(`[Ward] Initializing in ${currentMode} mode...`);

    if (currentMode === 'everyday') {
      everydaySession = await initializeEverydayMode();
      isAiAvailable = everydaySession !== null;
      console.log('[Ward] Everyday mode session:', everydaySession ? 'Created' : 'Failed');
    } else if (currentMode === 'ai-power-user') {
      aiPowerUserSessions = await initializeAIPowerUserMode();
      isAiAvailable = aiPowerUserSessions.aiSession !== null && aiPowerUserSessions.judgeSession !== null;
      console.log('[Ward] AI Power User sessions:', aiPowerUserSessions.aiSession ? 'Created' : 'Failed');
    }

    if (isAiAvailable) {
      console.log(`[Ward] ✓ ${currentMode} mode initialized successfully and ready`);
    } else {
      console.warn(`[Ward] ✗ Failed to initialize ${currentMode} mode - AI will not be available`);
    }

  } catch (error) {
    console.error('[Ward] Failed to initialize AI:', error);
    isAiAvailable = false;
  }
}

// Analyze content using current mode
async function analyzeContent(content) {
  if (!isAiAvailable) {
    console.error('[Ward] AI not available - cannot analyze');
    return {
      isMalicious: false,
      analysis: 'AI detection unavailable. Please enable Prompt API in chrome://flags.',
      judgment: 'ERROR',
      method: 'error',
      mode: currentMode,
      contentLength: content.length
    };
  }

  try {
    console.log(`[Ward] Running analysis in ${currentMode} mode`);

    if (currentMode === 'everyday') {
      console.log('[Ward] Using Everyday mode detector');
      return await analyzeEveryday(everydaySession, content);
    } else if (currentMode === 'ai-power-user') {
      console.log('[Ward] Using AI Power User mode detector');
      return await analyzeAIPowerUser(
        aiPowerUserSessions.aiSession,
        aiPowerUserSessions.judgeSession,
        content
      );
    }

    // Fallback if mode not recognized
    return {
      isMalicious: false,
      analysis: 'Unknown detection mode',
      judgment: 'ERROR',
      method: 'error',
      mode: currentMode,
      contentLength: content.length
    };

  } catch (error) {
    console.error('[Ward] Analysis error:', error);
    return {
      isMalicious: false,
      analysis: `Analysis error: ${error.message}`,
      judgment: 'ERROR',
      method: 'error',
      mode: currentMode,
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

    // Check if URL should be ignored
    shouldIgnoreUrl(url).then(ignored => {
      if (ignored) {
        console.log('[Ward] Skipping analysis for ignored URL:', url);
        sendResponse({
          isMalicious: false,
          analysis: 'This page is ignored and will not be scanned.',
          judgment: 'IGNORED',
          method: 'ignored',
          mode: currentMode,
          contentLength: content.length
        });
        return;
      }

      // Check cache first (using URL + content hash as key)
      const cacheKey = `${url}:${content.substring(0, 500)}`;
      if (DETECTION_CACHE.has(cacheKey)) {
        const cached = DETECTION_CACHE.get(cacheKey);
        console.log('[Ward] Returning cached result for URL:', url);
        sendResponse(cached);
        updateBadge(sender.tab.id, cached.isMalicious);
        return;
      }

      console.log('[Ward] Starting fresh analysis (not cached) for URL:', url);

      // Analyze the content with overall timeout
      const analysisStart = Date.now();
      const overallTimeout = setTimeout(() => {
        console.error('[Ward] Overall analysis timeout - taking too long');
        sendResponse({
          error: 'Analysis timeout',
          isMalicious: false,
          analysis: 'Analysis took too long and was cancelled. The page is assumed safe.',
          judgment: 'TIMEOUT',
          method: 'timeout',
          mode: currentMode,
          contentLength: content.length
        });
      }, 60000); // 60 second overall timeout

      analyzeContent(content).then(result => {
        clearTimeout(overallTimeout);
        const duration = Date.now() - analysisStart;
        console.log(`[Ward] Analysis completed in ${duration}ms`);

        // Cache the result
        DETECTION_CACHE.set(cacheKey, result);

        // Update badge based on result
        updateBadge(sender.tab.id, result.isMalicious);

        // Store detection result for this tab
        chrome.storage.local.set({
          [`detection_${sender.tab.id}`]: {
            result,
            url: sender.tab.url,
            timestamp: Date.now()
          }
        });

        sendResponse(result);
      }).catch(error => {
        clearTimeout(overallTimeout);
        console.error('[Ward] Analysis error:', error);
        sendResponse({
          error: error.message,
          isMalicious: false,
          analysis: error.message.includes('timeout')
            ? 'AI analysis timed out. This may indicate the Prompt API is still downloading or is overloaded.'
            : 'Analysis failed, defaulting to safe',
          judgment: 'ERROR',
          method: 'error',
          mode: currentMode,
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

  // Handle mode changes from settings page
  if (request.action === 'changeMode') {
    const newMode = request.mode;
    console.log(`[Ward] Switching from ${currentMode} to ${newMode} mode`);
    currentMode = newMode;

    // Reinitialize AI with new mode
    initializeAI().then(() => {
      // Clear cache when mode changes
      DETECTION_CACHE.clear();
      sendResponse({ success: true });
    });

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

// Clean up old cache entries periodically
setInterval(() => {
  if (DETECTION_CACHE.size > 100) {
    DETECTION_CACHE.clear();
  }
}, 300000); // Every 5 minutes

// Clear cache when navigating to a new page
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && changeInfo.url) {
    // Clear cache entries for this URL
    const urlPrefix = changeInfo.url;
    for (const key of DETECTION_CACHE.keys()) {
      if (key.startsWith(urlPrefix + ':')) {
        DETECTION_CACHE.delete(key);
      }
    }
    console.log('[Ward] Cleared cache for new navigation to:', changeInfo.url);
  }
});

// Initialize AI when extension starts
initializeAI();
