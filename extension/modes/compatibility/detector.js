// Compatibility Mode - Privacy-Focused & Lightweight
// Single-stage PII masking for low-end hardware or privacy-first users

export async function initializeCompatibilityMode() {
  console.log('[Ward Compatibility] ========================================');
  console.log('[Ward Compatibility] COMPATIBILITY MODE LOADING');
  console.log('[Ward Compatibility] ========================================');
  console.log('[Ward Compatibility] Initializing privacy masking mode...');

  if (!self.LanguageModel) {
    console.warn('[Ward Compatibility] Prompt API not available');
    return { session: null, availability: 'api-not-available' };
  }

  const availability = await self.LanguageModel.availability();
  console.log('[Ward Compatibility] Availability:', availability);

  if (availability === 'no') {
    console.warn('[Ward Compatibility] AI model not available on this device');
    return { session: null, availability: 'no' };
  }

  if (availability === 'after-download') {
    console.log('[Ward Compatibility] AI model needs to be downloaded');
    return { session: null, availability: 'after-download' };
  }

  try {
    // Single lightweight session for PII masking
    const session = await self.LanguageModel.create({
      temperature: 0.3, // Lower temperature for more deterministic masking
      topK: 10,
      initialPrompts: [
        {
          role: 'system',
          content: `You are a privacy filter. Your ONLY goal is to mask Personally Identifiable Information (PII) from the provided web content.

Instructions:
1. Identify PII: Names, phone numbers, email addresses, physical addresses, credit card numbers, SSNs.
2. Replace PII with [REDACTED].
3. PRESERVE the structural context (HTML tags, JSON structure, general sentence meaning) so it can be analyzed remotely later.
4. Return the masked text.

Example:
Input: "Contact John Doe at 555-0199 or john@example.com."
Output: "Contact [REDACTED] at [REDACTED] or [REDACTED]."

Input: "<div class='user'>Name: Sarah Smith</div>"
Output: "<div class='user'>Name: [REDACTED]</div>"
`
        }
      ]
    });

    console.log('[Ward Compatibility] Privacy session created successfully');
    return { session, availability: 'readily' };

  } catch (error) {
    console.error('[Ward Compatibility] Failed to create session:', error);
    return { session: null, availability: 'error' };
  }
}

export async function analyzeCompatibility(session, content, url = 'unknown') {
  console.log('[Ward Compatibility] analyzeCompatibility called');

  if (!session) {
    return {
      isMalicious: false,
      analysis: 'AI detection unavailable. Please enable Prompt API in chrome://flags.',
      judgment: 'ERROR',
      method: 'error',
      mode: 'compatibility',
      contentLength: content.length
    };
  }

  try {
    const maxChars = 2000; // Reduced context window for lightweight processing
    const trimmedContent = content.length > maxChars
      ? content.substring(0, maxChars) + '\n\n[Content truncated]'
      : content;

    // Include URL in the content to be masked if necessary, though usually we just mask the DOM
    const prompt = `Mask PII in this content:\nURL: ${url}\n\n${trimmedContent}`;

    console.log('[Ward Compatibility] Sending content for PII masking...');
    const maskedContent = await session.prompt(prompt);

    console.log('[Ward Compatibility] Masked content:', maskedContent);
    console.log('[Ward Compatibility] Masking complete.');

    // In compatibility mode, we don't detect threats locally. 
    // We pretend to be "Safe" but note that we are in Compatibility Mode.
    // In a real scenario, this masked content would be sent to a cloud API.
    
    return {
      isMalicious: false,
      analysis: 'Content has been locally masked for privacy. Ready for remote analysis (Cloud processing disabled).',
      judgment: 'COMPATIBILITY_MODE',
      method: 'masked_local',
      mode: 'compatibility',
      contentLength: content.length,
      maskedContent: maskedContent // Exposing this for debug/verification if needed
    };

  } catch (error) {
    console.error('[Ward Compatibility] Analysis failed:', error);
    return {
      isMalicious: false,
      analysis: 'Masking failed. Defaulting to safe.',
      judgment: 'ERROR',
      method: 'error',
      mode: 'compatibility',
      contentLength: content.length
    };
  }
}
