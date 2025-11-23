// Cloud Mode - Server-side Detection
// Redacts PII locally, then sends to Cloud Run for analysis

import { redactPII } from '../../utils/redactor.js';

export async function initializeCloudMode() {
  console.log('[Ward Cloud] Initializing Cloud Mode...');
  
  // Check if API URL is configured
  const { cloudApiUrl } = await chrome.storage.local.get(['cloudApiUrl']);
  
  if (!cloudApiUrl) {
    console.warn('[Ward Cloud] No API URL configured');
    return { availability: 'configure-required' };
  }

  try {
    // Basic health check
    // We'll just assume it's ready if the URL is there to save startup time,
    // or we could do a quick fetch to root if we wanted to be sure.
    console.log('[Ward Cloud] Cloud endpoint configured:', cloudApiUrl);
    return { availability: 'readily', apiUrl: cloudApiUrl };
  } catch (error) {
    console.error('[Ward Cloud] Initialization failed:', error);
    return { availability: 'error' };
  }
}

export async function analyzeCloud(sessionData, content, url = 'unknown') {
  console.log('[Ward Cloud] analyzeCloud called');
  
  const apiUrl = sessionData?.apiUrl;
  
  if (!apiUrl) {
    return {
      isMalicious: false,
      analysis: 'Cloud API URL not configured. Please go to Settings.',
      judgment: 'CONFIGURATION_ERROR',
      method: 'error',
      mode: 'cloud',
      contentLength: content.length
    };
  }

  try {
    // 1. Redact PII locally
    console.log('[Ward Cloud] Redacting PII...');
    const redactedContent = redactPII(content);
    
    // 2. Send to Cloud
    console.log(`[Ward Cloud] Sending ${redactedContent.length} chars to ${apiUrl}...`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: redactedContent,
        url: url
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Cloud API returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('[Ward Cloud] Received response:', result);

    // Ensure result matches expected format
    return {
      isMalicious: result.isMalicious || false,
      analysis: result.analysis || 'No analysis provided by cloud.',
      judgment: result.judgment || 'Cloud Scan Complete',
      method: 'cloud-vertex-ai',
      mode: 'cloud',
      contentLength: content.length
    };

  } catch (error) {
    console.error('[Ward Cloud] Analysis failed:', error);
    
    let errorMsg = 'Connection to Cloud Scanner failed.';
    if (error.name === 'AbortError') {
      errorMsg = 'Cloud Scan timed out (30s).';
    }

    return {
      isMalicious: false,
      analysis: `${errorMsg} Please check your internet connection and API settings.`,
      judgment: 'ERROR',
      method: 'error',
      mode: 'cloud',
      contentLength: content.length
    };
  }
}
