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

"SAFE" - if content is a normal website (news, articles, shopping, information) OR a legitimate notification email

"SCAM" - ONLY if content is trying to steal information (fake login pages, virus warnings, urgent requests for passwords/payment)

Rules:
- If you see 3+ different company/sender names → say "INBOX"
- If content is incomplete, truncated, or preview text → say "INBOX"
- If FROM field shows legitimate company domain (e.g., noreply@discord.com, alert@amazon.com) → say "SAFE"
- If email is from official domain matching the company in the content → say "SAFE"
- If just a normal website → say "SAFE"
- Only say "SCAM" if sender domain is suspicious OR if clearly fake and asking for sensitive info

Examples:
Input: "Gmail inbox. Namecheap order. Discord notification. LinkedIn message. Cabela's shipping."
Output: INBOX

Input: "FROM: Discord <noreply@discord.com>\nSUBJECT: Login from new location\nSomeone tried to log into your account. Click to verify."
Output: SAFE

Input: "BBC News. Prime Minister announces policy. Scientists discover species."
Output: SAFE

Input: "FROM: PayPal <security@paypal-verify.xyz>\nPayPal Login. Enter your email: ___ Enter your password: ___ [LOGIN]"
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
      temperature: 0.6,
      topK: 30,
      initialPrompts: [
        {
          role: 'system',
          content: `You decide if content is a CONFIRMED THREAT or SAFE. Only flag CONFIRMED scams with clear evidence.

IMPORTANT: "Suspicious", "potential", or "could be" are NOT enough. Only flag CONFIRMED threats.

RULE #1: Legitimate sender domain = SAFE
- @discord.com, @paypal.com, @amazon.com, @bankofamerica.com = Real company domains
- Real companies send security alerts, login verifications, password resets
- These are ALWAYS SAFE, even if they ask you to verify your account

RULE #2: Only flag THREAT if ALL of these are true:
1. FAKE sender domain (paypal-secure.xyz, amaz0n.net, discrod.com, microsoft-support.tk) OR suspicious URL domain
2. Requests sensitive info (password, credit card, SSN)
3. Contains urgent threats or fear tactics

RULE #3: URL Analysis
- Check if the page URL matches the claimed company (e.g., paypal.com content on paypal-verify.tk = THREAT)
- Look for typosquatting domains (amaz0n.com, facebo0k.com, g00gle.com)
- Suspicious TLDs for financial sites: .tk, .ml, .ga, .cf, .xyz (not always malicious, but red flag)
- URL shorteners or suspicious redirects can be a warning sign

RULE #4: Chrome Extension Installation Prompts
- Content prompting to install Chrome extensions for security/verification = THREAT
- "Install our security extension to continue" = THREAT
- "Add Chrome extension to verify your account" = THREAT
- Legitimate companies NEVER require extension installation for basic account access

RULE #5: If in doubt → say SAFE

Examples of SAFE:
- "Discord <noreply@discord.com> Someone logged in from Philadelphia. Verify if this was you." → Real Discord domain = SAFE
- "PayPal <service@paypal.com> Confirm your $500 payment to John" → Real PayPal domain = SAFE
- "Your bank <alerts@chase.com> New login detected from New York" → Real bank = SAFE
- Security notifications from official domains are ALWAYS SAFE

Examples of THREAT (need ALL indicators):
- "PayPal <verify@paypal-secure.tk> URGENT! Enter password NOW or we DELETE your account!" → Fake domain + threats + password request = THREAT
- "VIRUS ALERT! Your PC is infected! Call 1-800-SCAMMER immediately!" → Tech support scam with phone number = THREAT
- "Microsoft <help@micros0ft.xyz> Download this fix or your Windows expires" → Fake domain + fake download = THREAT
- "Install our Chrome extension to verify your PayPal account" on paypal-verify.xyz → Extension prompt + fake domain = THREAT

If legitimate sender domain → ALWAYS say SAFE. Never flag legitimate companies as threats.

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

export async function analyzeEveryday(analyzerSession, judgeSession, content, url = 'unknown') {
  console.log('[Ward Everyday] analyzeEveryday called with:', {
    hasAnalyzerSession: !!analyzerSession,
    hasJudgeSession: !!judgeSession,
    contentLength: content.length,
    url: url
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
    console.log('[Ward Everyday] Stage 1 classification:', classification);

    let judgment;
    try {
      const judgmentPrompt = `The analyzer classified this as a potential SCAM. Review if this is truly dangerous or a false positive.

URL: ${url}

Content preview:
${trimmedContent.substring(0, 1000)}

Is this a real THREAT or SAFE?`;

      console.log('[Ward Everyday Stage 2] ===== FULL JUDGE INPUT =====');
      console.log('[Ward Everyday Stage 2] Prompt being sent to judge:');
      console.log(judgmentPrompt);
      console.log('[Ward Everyday Stage 2] ===== END JUDGE INPUT =====');

      const judgmentPromiseRaw = judgeSession.prompt(judgmentPrompt);
      const timeoutPromise2 = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Judgment timed out after 30 seconds')), 30000)
      );

      judgment = await Promise.race([judgmentPromiseRaw, timeoutPromise2]);

      console.log('[Ward Everyday Stage 2] ===== FULL JUDGE OUTPUT =====');
      console.log('[Ward Everyday Stage 2] Raw judgment response:');
      console.log(judgment);
      console.log('[Ward Everyday Stage 2] ===== END JUDGE OUTPUT =====');
    } catch (stage2Error) {
      console.error('[Ward Everyday Stage 2] FAILED:', stage2Error);
      throw stage2Error;
    }

    const isThreat = judgment.trim().toUpperCase().includes('THREAT');

    console.log('[Ward Everyday Stage 2] Final decision:', {
      rawJudgment: judgment.trim(),
      containsThreatKeyword: isThreat,
      finalDecision: isThreat ? 'THREAT' : 'SAFE'
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
