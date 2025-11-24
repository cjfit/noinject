// Cloud Mode - Server-side Detection
// Redacts PII locally, then sends to Cloud Run for analysis

import { redactPII } from '../../utils/redactor.js';

const CLOUD_API_URL = 'https://us-central1-ward-479122.cloudfunctions.net/ward-scanner';

export async function initializeCloudMode() {
  console.log('[Ward Cloud] Initializing Cloud Mode...');

  try {
    console.log('[Ward Cloud] Using cloud endpoint:', CLOUD_API_URL);
    return { availability: 'readily', apiUrl: CLOUD_API_URL };
  } catch (error) {
    console.error('[Ward Cloud] Initialization failed:', error);
    return { availability: 'error' };
  }
}

export async function analyzeCloud(sessionData, content, url = 'unknown') {
  console.log('[Ward Cloud] analyzeCloud called');

  const apiUrl = sessionData?.apiUrl || CLOUD_API_URL;

  try {
    // 1. Get auth credentials
    const { installId, userEmail } = await chrome.storage.local.get(['installId', 'userEmail']);

    // 2. Redact PII locally
    console.log('[Ward Cloud] Redacting PII...');
    const redactedContent = redactPII(content);

    // 3. Send to Cloud with auth headers
    console.log(`[Ward Cloud] Sending ${redactedContent.length} chars to ${apiUrl}...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const headers = {
      'Content-Type': 'application/json',
      'X-Ward-Install-ID': installId || 'unknown'
    };

    if (userEmail) {
      headers['X-Ward-User-Email'] = userEmail;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        content: redactedContent,
        url: url
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Handle quota exceeded
    if (response.status === 429) {
      const errorData = await response.json();
      return {
        isMalicious: false,
        analysis: 'Quota exceeded',
        judgment: 'QUOTA_EXCEEDED',
        method: 'quota-error',
        mode: 'cloud',
        contentLength: content.length,
        quota: errorData.quota
      };
    }

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
