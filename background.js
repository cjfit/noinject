// Ward Background Service Worker
// Handles AI-powered threat detection using Chrome's Prompt API

import { initializeEverydayMode, analyzeEveryday } from './modes/everyday/detector.js';
import { initializeAIPowerUserMode, analyzeAIPowerUser } from './modes/ai-power-user/detector.js';

console.log('[Ward] Background script starting...');
console.log('[Ward] Imports check:', {
  hasInitializeEverydayMode: typeof initializeEverydayMode === 'function',
  hasAnalyzeEveryday: typeof analyzeEveryday === 'function',
  hasInitializeAIPowerUserMode: typeof initializeAIPowerUserMode === 'function',
  hasAnalyzeAIPowerUser: typeof analyzeAIPowerUser === 'function'
});

let currentMode = 'everyday'; // Default mode
let everydaySessions = { analyzerSession: null, judgeSession: null };
let aiPowerUserSessions = { aiSession: null, judgeSession: null };
let isAiAvailable = false;
const DETECTION_CACHE = new Map(); // Cache results per URL
const ACTIVE_ANALYSES = new Map(); // Track ongoing analyses by tabId

// Initialize AI based on current mode
async function initializeAI() {
  try {
    // Load saved mode from storage
    const { detectionMode = 'everyday' } = await chrome.storage.local.get(['detectionMode']);
    currentMode = detectionMode;

    console.log(`[Ward] Initializing in ${currentMode} mode...`);

    if (currentMode === 'everyday') {
      console.log('[Ward] Calling initializeEverydayMode()...');
      console.log('[Ward] initializeEverydayMode function:', initializeEverydayMode);

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
async function analyzeContent(content, url = 'unknown') {
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

    // Check if content script marked this as skipped
    if (request.skipped) {
      console.log('[Ward] Content script skipped analysis for:', url);
      const skipResult = {
        isMalicious: false,
        analysis: 'Page scanning skipped (email platform interface)',
        judgment: 'SKIPPED',
        method: 'skipped',
        mode: currentMode,
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
          mode: currentMode,
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

      // Check cache first (using URL + content hash as key)
      const cacheKey = `${url}:${content.substring(0, 500)}`;
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
          mode: currentMode,
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
        if (analysisTracker.cancelled) {
          console.log(`[Ward] Analysis cancelled for tab ${tabId}, ignoring error`);
          return;
        }

        clearTimeout(analysisTracker.timeout);
        ACTIVE_ANALYSES.delete(tabId);
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

// Clear stored tab state when navigating to a new page (but keep DETECTION_CACHE)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Trigger on any loading event, whether URL changed or not
  if (changeInfo.status === 'loading') {
    // Skip chrome:// pages and extension pages
    if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://'))) {
      console.log('[Ward] Skipping chrome:// or extension page:', tab.url);
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

    // Reset badge to default state while new page loads
    updateBadge(tabId, false);

    console.log('[Ward] Cleared tab state for navigation');
    // Note: DETECTION_CACHE is preserved so revisiting pages uses cached results
  }
});

// Initialize AI when extension starts
initializeAI();
