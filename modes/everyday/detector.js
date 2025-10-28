// Everyday Mode - Consumer Protection
// Single-pass AI detection focused on phishing, scams, and common threats

export async function initializeEverydayMode(aiSession) {
  console.log('[Ward Everyday] Initializing consumer protection mode...');

  if (!self.LanguageModel) {
    console.warn('[Ward Everyday] Prompt API not available');
    return null;
  }

  const availability = await self.LanguageModel.availability();

  if (availability === 'no') {
    console.warn('[Ward Everyday] AI model not available on this device');
    return null;
  }

  if (availability === 'after-download') {
    console.log('[Ward Everyday] AI model needs to be downloaded');
  }

  // Create single AI session for fast consumer threat detection
  const session = await self.LanguageModel.create({
    temperature: 0.2, // Even lower temperature for more conservative detection
    topK: 15,
    initialPrompts: [
      {
        role: 'system',
        content: `You are a security assistant protecting everyday web users from scams and phishing on websites.

CRITICAL: If you see ANY of these indicators, respond SAFE immediately:
- Multiple email subjects or senders listed (Gmail inbox, list view)
- Words like "Inbox", "Promotions", "Social", "Primary" tabs
- Email counts like "1-25 of 9,427" or message pagination
- Navigation sidebars with folders (Inbox, Sent, Drafts, Spam)
- Multiple conversations or threads visible at once
- Any legitimate email service interface (mail.google.com, outlook.com, yahoo.com)

These are EMAIL PLATFORMS, not threats. The user is browsing their mail, not viewing a scam.

ONLY analyze individual pages/messages that:
- Are standalone web pages (not email platforms)
- Are trying to trick the user directly RIGHT NOW
- Contain actual scam content requesting action

Examples of REAL threats (not email platforms):
- Fake "Your computer has a virus" pop-ups with phone numbers
- Fake login pages pretending to be PayPal/Netflix/banks
- Standalone scam websites offering fake prizes
- Fake package delivery pages demanding payment
- Tech support scam landing pages

For emails: Only flag if you're viewing a SINGLE EMAIL in full detail (not a list) AND it's clearly a scam (not from State Farm, Amazon, real companies).

Default to SAFE. Be extremely conservative on email platforms.

Respond with: SAFE or THREAT followed by brief explanation.`
      }
    ]
  });

  console.log('[Ward Everyday] Consumer protection mode initialized');
  return session;
}

export async function analyzeEveryday(session, content) {
  if (!session) {
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
    // Trim content for faster processing (3k chars for consumer mode)
    const maxChars = 3000;
    const trimmedContent = content.length > maxChars
      ? content.substring(0, maxChars) + '\n\n[Content truncated]'
      : content;

    const prompt = `Analyze this web page content for scams, phishing, or suspicious activity that could harm everyday users:\n\n${trimmedContent}\n\nIs this SAFE or a THREAT?`;

    console.log('[Ward Everyday] Analyzing content:', {
      contentLength: trimmedContent.length,
      preview: trimmedContent.substring(0, 150) + '...'
    });

    // Add timeout (30 seconds for single-pass - increased for reliability)
    const analysisPromise = session.prompt(prompt);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Analysis timed out after 30 seconds')), 30000)
    );

    const response = await Promise.race([analysisPromise, timeoutPromise]);

    // Parse response
    const isThreat = response.trim().toUpperCase().startsWith('THREAT');
    const judgment = isThreat ? 'THREAT' : 'SAFE';

    console.log('[Ward Everyday] Analysis complete:', {
      judgment,
      isThreat,
      response: response.substring(0, 200)
    });

    if (isThreat) {
      console.log('[Ward Everyday] THREAT DETECTED:', {
        fullResponse: response,
        contentSample: trimmedContent.substring(0, 300)
      });
    }

    return {
      isMalicious: isThreat,
      analysis: response,
      judgment,
      method: 'ai',
      mode: 'everyday',
      contentLength: content.length
    };

  } catch (error) {
    console.error('[Ward Everyday] Analysis failed:', error);
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
