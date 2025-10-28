// Everyday Mode - Consumer Protection
// Two-stage AI detection focused on phishing, scams, and common threats
// VERSION: 2.0 - Two-stage detection

export async function initializeEverydayMode() {
  console.log('[Ward Everyday] ========================================');
  console.log('[Ward Everyday] VERSION 2.0 TWO-STAGE SYSTEM LOADING');
  console.log('[Ward Everyday] ========================================');
  console.log('[Ward Everyday] *** initializeEverydayMode FUNCTION CALLED ***');
  console.log('[Ward Everyday] Initializing consumer protection mode...');

  if (!self.LanguageModel) {
    console.warn('[Ward Everyday] Prompt API not available');
    return { analyzerSession: null, judgeSession: null };
  }

  const availability = await self.LanguageModel.availability();

  if (availability === 'no') {
    console.warn('[Ward Everyday] AI model not available on this device');
    return { analyzerSession: null, judgeSession: null };
  }

  if (availability === 'after-download') {
    console.log('[Ward Everyday] AI model needs to be downloaded');
  }

  try {
    // Stage 1: Analyzer session - identifies potential threats
    const analyzerSession = await self.LanguageModel.create({
      temperature: 1,
      topK: 40,
      initialPrompts: [
        {
          role: 'system',
          content: `Classify web page content. Reply with ONLY ONE of these exact phrases:

"INBOX" - if content shows multiple emails/messages from different senders (Gmail, Outlook, Reddit, Twitter, Facebook, forums, message lists)

"SAFE" - if content is a normal website (news, articles, shopping, information)

"SCAM" - ONLY if content is trying to steal information (fake login pages, virus warnings, urgent requests for passwords/payment)

Rules:
- If you see 3+ different company/sender names → say "INBOX"
- If content is incomplete, truncated, or preview text → say "INBOX"
- If just a normal website → say "SAFE"
- Only say "SCAM" if it's clearly fake and asking for sensitive info

Examples:
Input: "Gmail inbox. Namecheap order. Discord notification. LinkedIn message. Cabela's shipping."
Output: INBOX

Input: "BBC News. Prime Minister announces policy. Scientists discover species."
Output: SAFE

Input: "PayPal Login. Enter your email: ___ Enter your password: ___ [LOGIN]"
Output: SCAM

Input: "WARNING! Your computer has viruses! Call 1-800-555-0000 NOW!"
Output: SCAM

Reply with ONE WORD ONLY: INBOX, SAFE, or SCAM`
        }
      ]
    });

    console.log('[Ward Everyday] Analyzer session created successfully');

    // Stage 2: Judge session - validates if it's a real threat or false positive
    const judgeSession = await self.LanguageModel.create({
      temperature: 0.6,  // Even higher temperature for better judgment
      topK: 30,
      initialPrompts: [
        {
          role: 'system',
          content: `You decide if a page is truly dangerous or a false alarm.

CRITICAL RULE #1: If the analysis mentions brands like "Namecheap" AND "Cabela's" AND "Discord" AND "LinkedIn" together, this is someone's EMAIL INBOX showing many different emails. This is SAFE.

CRITICAL RULE #2: If the analysis says "Inconsistent Branding" or "mentions various brands" or "unrelated companies", this means it's an inbox list view. This is SAFE.

CRITICAL RULE #3: If the analysis mentions 4 or more company names, it's an inbox. This is SAFE.

Example of SAFE (inbox):
"The page mentions Namecheap, Cabela's, Discord, LinkedIn, and NYT. Inconsistent branding with various unrelated companies."
→ This is clearly an inbox showing multiple emails. Say SAFE.

Example of THREAT (single scam):
"Fake PayPal login page requesting password and credit card"
→ This is a single scam page. Say THREAT.

Default to SAFE unless you see a SINGLE scam page.

Respond: SAFE or THREAT`
        }
      ]
    });

    console.log('[Ward Everyday] Judge session created successfully');
    console.log('[Ward Everyday] Consumer protection mode initialized with two-stage detection');
    return { analyzerSession, judgeSession };

  } catch (error) {
    console.error('[Ward Everyday] Failed to create sessions:', error);
    return { analyzerSession: null, judgeSession: null };
  }
}

export async function analyzeEveryday(analyzerSession, judgeSession, content) {
  console.log('[Ward Everyday] analyzeEveryday called with:', {
    hasAnalyzerSession: !!analyzerSession,
    hasJudgeSession: !!judgeSession,
    contentLength: content.length
  });

  if (!analyzerSession || !judgeSession) {
    console.error('[Ward Everyday] Missing sessions:', {
      analyzerSession: !!analyzerSession,
      judgeSession: !!judgeSession
    });
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
    // Stage 1: Classify content as INBOX, SAFE, or SCAM
    const maxChars = 3000;
    const trimmedContent = content.length > maxChars
      ? content.substring(0, maxChars) + '\n\n[Content truncated]'
      : content;

    const analysisPrompt = `Classify this content:\n\n${trimmedContent}`;

    console.log('[Ward Everyday Stage 1] Classifying content:', {
      contentLength: trimmedContent.length,
      preview: trimmedContent.substring(0, 150) + '...'
    });

    let classification;
    try {
      const analysisPromise = analyzerSession.prompt(analysisPrompt);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Analysis timed out after 30 seconds')), 30000)
      );

      classification = await Promise.race([analysisPromise, timeoutPromise]);
      classification = classification.trim().toUpperCase();

      console.log('[Ward Everyday Stage 1] Classification complete:', {
        classification: classification,
        classificationLength: classification.length
      });
    } catch (stage1Error) {
      console.error('[Ward Everyday Stage 1] FAILED:', stage1Error);
      throw stage1Error;
    }

    // If classified as INBOX or SAFE, skip judge and return safe immediately
    if (classification.includes('INBOX') || classification.includes('SAFE')) {
      const reason = classification.includes('INBOX')
        ? 'Content appears to be an inbox or message feed with multiple items'
        : 'Content appears to be a normal website with no threats detected';

      console.log('[Ward Everyday] Stage 1 marked as safe:', classification);

      return {
        isMalicious: false,
        analysis: reason,
        judgment: 'SAFE',
        method: 'ai',
        mode: 'everyday',
        contentLength: content.length
      };
    }

    // Only if classified as SCAM, go to Stage 2 judge for validation
    console.log('[Ward Everyday] Stage 1 detected potential scam, sending to judge...');

    let judgment;
    try {
      const judgmentPrompt = `The analyzer classified this as a potential SCAM. Review if this is truly dangerous or a false positive.\n\nContent preview:\n${trimmedContent.substring(0, 1000)}\n\nIs this a real THREAT or SAFE?`;

      console.log('[Ward Everyday Stage 2] Getting judgment...');

      const judgmentPromiseRaw = judgeSession.prompt(judgmentPrompt);
      const timeoutPromise2 = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Judgment timed out after 30 seconds')), 30000)
      );

      judgment = await Promise.race([judgmentPromiseRaw, timeoutPromise2]);

      console.log('[Ward Everyday Stage 2] Raw judgment response:', judgment);
    } catch (stage2Error) {
      console.error('[Ward Everyday Stage 2] FAILED:', stage2Error);
      throw stage2Error;
    }

    const isThreat = judgment.trim().toUpperCase().includes('THREAT');

    console.log('[Ward Everyday Stage 2] Judgment complete:', {
      judgment: judgment.trim(),
      isThreat,
      detectedAs: isThreat ? 'THREAT' : 'SAFE',
      fullJudgment: judgment
    });

    if (isThreat) {
      console.log('[Ward Everyday] THREAT DETECTED:', {
        classification: classification,
        verdict: judgment.trim(),
        contentSample: trimmedContent.substring(0, 500)
      });
    }

    return {
      isMalicious: isThreat,
      analysis: isThreat ? 'Potential scam or phishing attempt detected' : 'False positive - content is safe',
      judgment: judgment.trim(),
      method: 'ai',
      mode: 'everyday',
      contentLength: content.length
    };

  } catch (error) {
    console.error('[Ward Everyday] Analysis failed:', error);
    console.error('[Ward Everyday] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return {
      isMalicious: false,
      analysis: 'Page scan incomplete. No immediate threats detected in visible content.',
      judgment: 'ERROR',
      method: 'error',
      mode: 'everyday',
      contentLength: content.length
    };
  }
}
