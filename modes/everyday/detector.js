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
          content: `You are analyzing EMAIL and WEBSITE CONTENT (including hyperlinks and buttons). The platform displaying the content (Gmail, Outlook, etc.) is legitimate. Ignore any "Ward" security banners - that's your own extension.

Classify content. Reply with ONLY ONE of these exact phrases:

"INBOX" - if showing multiple emails/messages from different senders (email inbox list, message feed)

"SAFE" - if content is normal (news, shopping, legitimate email notifications)

"SCAM" - if the EMAIL or WEBSITE CONTENT contains fraud tactics

NOTE: Links will be provided in format: [LINK] "text" → url or [BUTTON] "text" → url

Rules:
- If you see 3+ different sender names (email list view) → say "INBOX"
- If content is incomplete, truncated, or preview text → say "INBOX"
- Legitimate email FROM domains (noreply@discord.com, alert@amazon.com, etc.) → say "SAFE"
- Normal websites (news, shopping, articles) → say "SAFE"
- Say "SCAM" ONLY if the email or webpage content contains:
  * Prizes/sweepstakes: "You've won!", free gifts requiring personal info
  * Unclaimed funds: "You have unclaimed money/funds", "Claim your refund/settlement"
  * Investment/crypto: guaranteed returns, low-risk promises
  * Fake checks: deposit this check, mystery shopper schemes
  * Romance/friendship: online relationship asking for money
  * Loan scams: advance fee loans, pay upfront for credit
  * Urgency tactics: "Act now!", "Limited time!", "Account suspended!"
  * Unusual payment requests: gift cards, crypto, wire transfer for suspicious purposes
  * Spoofed email senders: FROM domain doesn't match company (paypal@verify-secure.tk)
  * Suspicious extension prompts: Ad blocker installations from non-Chrome Web Store domains, driver update extensions, popup extension installers

Examples:
Input: "Gmail inbox. Namecheap order. Discord notification. LinkedIn message. Cabela's shipping."
Output: INBOX

Input: "FROM: Discord <noreply@discord.com>\nSUBJECT: Login from new location\nSomeone tried to log into your account. Click to verify."
Output: SAFE

Input: "BBC News. Prime Minister announces policy. Scientists discover species."
Output: SAFE

Input: "FROM: PayPal <security@paypal-verify.xyz>\nPayPal Login. Enter your email: ___ Enter your password: ___ [LOGIN]"
Output: SCAM

Input: "CONGRATULATIONS! You've won a $1000 gift card! Claim within 24 hours or it expires!"
Output: SCAM

Input: "Hi dear, I'm Sarah. I need help urgently. Can you send $500 via gift cards? I'll pay you back tomorrow."
Output: SCAM

Input: "Invest in Bitcoin now! Guaranteed 300% returns. Low risk, high reward. Limited spots available!"
Output: SCAM

Reply with ONE WORD ONLY: INBOX, SAFE, or SCAM`
        }
      ]
    });

    console.log('[Ward Everyday] Analyzer session created successfully');

    // Stage 2: Judge session - validates if it's a real threat or false positive
    // Configure for multimodal input (text + images)
    const judgeSession = await self.LanguageModel.create({
      temperature: 0.6,
      topK: 30,
      expectedInputs: [
        { type: "text", languages: ["en"] },
        { type: "image", languages: ["en"] }
      ],
      expectedOutputs: [
        { type: "text", languages: ["en"] }
      ],
      initialPrompts: [
        {
          role: 'system',
          content: `You are analyzing EMAIL and WEBSITE CONTENT (including hyperlinks and buttons). The website/platform itself (Gmail, Outlook, news sites) is LEGITIMATE. Judge if the CONTENT SHOWN is a threat.

Decide if content is a CONFIRMED THREAT or SAFE. Flag CONFIRMED fraud with clear evidence.

IMPORTANT:
- IGNORE Ward security warnings/banners - that's YOUR OWN extension, not a threat
- Only flag CONFIRMED threats in the content itself, not vague suspicions
- The platform displaying content (Gmail, Yahoo Mail, Outlook) is NOT spoofed
- You're checking if an EMAIL MESSAGE or WEBPAGE CONTENT contains scams
- Links are shown as: [LINK] "text" → url or [BUTTON] "text" → url
- Check link URLs for suspicious domains, typosquatting, or mismatches with button text

RULE #1: Legitimate email sender domain = SAFE
- @discord.com, @paypal.com, @amazon.com, @bankofamerica.com = Real company domains
- Real companies send security alerts, login verifications, password resets
- These are ALWAYS SAFE, even if they ask you to verify your account

RULE #2: RED FLAGS - Flag as THREAT if you see these fraud indicators IN THE CONTENT:
A) FALSE URGENCY: "Act now!", "Limited time!", "Account suspended!", "Emergency!", countdown timers creating pressure
B) UNUSUAL PAYMENT: Requests for gift cards, cryptocurrency, wire transfer, P2P apps, cash for unusual purposes
C) ISOLATION TACTICS: "Don't tell anyone", "Keep this secret", "You can't trust others", "Only share with me"

RULE #3: COMMON SCAM PATTERNS (flag if present):
1. Prizes/Sweepstakes: "You've won!", free gifts requiring personal/payment info, "Congratulations! You've been selected!"
2. Unclaimed Funds: "You have unclaimed money/funds", "Claim your refund", "Unclaimed settlement waiting", requests for personal info or fees to claim
3. Phishing/Spoofing: Fake login pages, fake domains (paypal-secure.tk, amaz0n.net), password/credit card requests from suspicious sources
4. Fake Merchandise: Too-good-to-be-true deals, fake online stores, suspiciously low prices on luxury goods
5. Investment/Crypto Scams: Guaranteed returns, "no risk" claims, fake trading platforms, pressure to invest quickly
6. Fake Check Scams: "Deposit this check", mystery shopper jobs, overpayment schemes, "cash this and send money back"
7. Advance Fee Loans: "Pay upfront fee to get loan", credit repair from non-banks, "approved" loans requiring payment first
8. Romance/Friendship Scams: Online relationship asking for money, "I need help urgently", sob stories, financial requests from "friends"
9. Adult Services/Info Scams: Fake subscription charges, blackmail threats, fake dating sites requesting payment
10. Chrome Extension Prompts: "Install our extension to verify", security extensions required for basic access, fake driver update warnings, "missing drivers" alerts
11. Suspicious Extension Installation Sites: Ad blocker or extension installation sites that are NOT the official Chrome Web Store (chrome.google.com/webstore), especially ad blockers from random domains, popup installers
12. Fake Login Pages: Login pages impersonating legitimate businesses (banks, retailers like Best Buy, services) with suspicious domains, typosquatting, or mismatched URLs
13. Remote Support Phishing: ScreenConnect/ConnectWise login pages, unexpected remote support requests via email/phone/text (legitimate support never contacts unsolicited), hang up immediately if hesitant
14. Healthcare/Medication Scams: Medicaid/Medicare fake enrollment, discount prescription cards requesting personal info, pharmacy sites with suspicious pricing

RULE #4: Email Sender Domain Analysis (for emails only)
- Check if email FROM domain matches the company: Discord emails should come from @discord.com, PayPal from @paypal.com
- Typosquatting domains: paypal@secure-verify.tk, amazon@amaz0n.net, discord@discrod.com
- Suspicious TLDs for financial emails: .tk, .ml, .ga, .cf, .xyz
- Mismatched sender: "PayPal" email from @paypal-verify.tk = THREAT

RULE #5: URL Analysis for Suspicious Sites
- Affiliate/adware tracking parameters (e.g., _u=, _a=, _x=, _w=, _q=, _z=) indicate potential adware network, especially on extension installation sites
- These are NOT URL shorteners, but referral/tracking IDs used by malicious ad networks to monetize installs
- Suspicious when combined with extension installation prompts

RULE #6: Visual/Image Analysis (if images provided)
- Logo on mismatched domain: Perfect PayPal logo on non-paypal.com domain, bank logo on suspicious site
- Low quality images: Pixelated, blurry, or heavy JPEG artifacts on logos/badges (especially on credential request pages)
- Outdated brand logos: Old logo versions from companies that rebranded years ago
- Screenshot artifacts: Browser chrome, taskbars, watermarks, or mouse cursor visible in images
- Excessive trust badges: Multiple security badges (Norton, McAfee, BBB, "Verified") clustered together (legitimate sites use 1-2 max)

RULE #7: If in doubt → say SAFE

Examples of SAFE:
- "Discord <noreply@discord.com> Someone logged in from Philadelphia." → SAFE

Examples of THREAT (use format below):
Input: "URGENT! You've won $5000! Claim in 1 hour! Pay $50 processing fee via gift card."
Output: THREAT
This is a prize scam using urgency tactics and requesting unusual payment.
* False urgency ("Claim in 1 hour")
* Unusual payment method (gift card)
* Unsolicited prize claim
**Do not respond or provide payment.** This is a scam designed to steal your money. Legitimate prizes never require upfront fees.

Input: "You have $2,847 in unclaimed funds! Claim your refund now. Provide SSN and pay $49 processing fee."
Output: THREAT
This is an unclaimed funds scam requesting personal information and upfront fees.
* Requests SSN (sensitive personal information)
* Demands processing fee upfront
* Unsolicited claim of money owed
**Do not provide your SSN or payment.** Legitimate government agencies and banks don't ask for fees to claim your own money.

Input: "FROM: Your Bank <alerts@secure-chase.xyz> Account suspended! Enter password immediately!"
Output: THREAT
This is a phishing attempt using a spoofed sender domain and urgency tactics.
* Fake sender domain (secure-chase.xyz, not chase.com)
* Urgency tactic ("immediately")
* Requests password/credentials
**Do not click any links or enter your password.** Contact your bank directly using the phone number on your card or official website.

RESPONSE FORMAT FOR THREATS:
Line 1: "THREAT"
Line 2: One sentence summary describing the scam type
Lines 3+: Bullet points with * explaining specific red flags
Last section: **Bolded recommendation** followed by brief explanation

Respond: SAFE or use the THREAT format above`
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

export async function analyzeEveryday(analyzerSession, judgeSession, content, url = 'unknown', images = []) {
  console.log('[Ward Everyday] analyzeEveryday called with:', {
    hasAnalyzerSession: !!analyzerSession,
    hasJudgeSession: !!judgeSession,
    contentLength: content.length,
    imageCount: images.length,
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
      let judgmentPrompt = `The analyzer classified this as a potential SCAM. Review if this is truly dangerous or a false positive.

URL: ${url}

Content preview:
${trimmedContent.substring(0, 1000)}`;

      // Add image information if images are provided
      if (images && images.length > 0) {
        judgmentPrompt += `\n\nImages found on page (${images.length} total):\n`;
        images.forEach((img, i) => {
          judgmentPrompt += `Image ${i + 1}: ${img.src} (${img.width}x${img.height}) ${img.alt ? `Alt: "${img.alt}"` : ''}\n`;
        });
        judgmentPrompt += `\nAnalyze the images for visual red flags (logo mismatches, low quality, outdated branding, screenshot artifacts, excessive badges).`;
      }

      judgmentPrompt += `\n\nIs this a real THREAT or SAFE?`;

      console.log('[Ward Everyday Stage 2] ===== FULL JUDGE INPUT =====');
      console.log('[Ward Everyday Stage 2] Prompt being sent to judge:');
      console.log(judgmentPrompt);
      console.log('[Ward Everyday Stage 2] Images:', images.length);
      console.log('[Ward Everyday Stage 2] ===== END JUDGE INPUT =====');

      // For multimodal prompts, pass images as part of the prompt
      const judgmentPromiseRaw = images && images.length > 0
        ? judgeSession.prompt(judgmentPrompt, { images })
        : judgeSession.prompt(judgmentPrompt);

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
