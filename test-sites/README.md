# Ward Test Sites

This folder contains realistic phishing and scam examples for testing Ward's threat detection capabilities.

## Test Files

### Phishing Emails

**fake-bank-2fa-urgency.html**
- Simulates a phishing email claiming to be from Chase Bank
- Uses urgency tactics and threats of account suspension
- Designed to test detection of:
  - Brand impersonation
  - Urgency/pressure tactics
  - Fake deadlines
  - Suspicious sender domain mismatch

**chase-login.html**
- Fake Chase Bank login page
- Designed to test detection of:
  - Login page impersonation
  - Domain spoofing
  - Credential harvesting attempts

## Testing Methodology

### How to Test

1. **Load Test Page**
   - Open a test HTML file in Chrome
   - OR send it as an HTML email to test email client detection

2. **Wait for Analysis**
   - Ward will automatically scan the page
   - Analysis takes 5-10 seconds

3. **Check Results**
   - Click the Ward extension icon
   - Verify threat is detected
   - Review the AI's reasoning

### Expected Results

All test files should be flagged as **THREAT** with:
- Clear identification of the impersonated brand
- Specific red flags listed (urgency, mismatched domain, etc.)
- Actionable recommendation for the user

## Adding New Test Cases

To add a new phishing/scam test:

1. Create a new HTML file in this directory
2. Use realistic content (actual phishing tactics)
3. Include common scam elements:
   - Urgency language
   - Authority impersonation
   - Suspicious links
   - Fake deadlines
4. Test with Ward to verify detection
5. Document the test case in this README

### Test Case Template

```html
<!DOCTYPE html>
<html>
<head>
  <title>Test Case: [Description]</title>
  <style>
    /* Make it look realistic */
  </style>
</head>
<body>
  <!-- Phishing content here -->
</body>
</html>
```

## Common Phishing Tactics to Test

- **Urgency**: "Act now!", "Within 24 hours", "Account will be suspended"
- **Authority**: Impersonating banks, government, tech support
- **Fear**: Threats of account closure, legal action, data loss
- **Greed**: Prizes, refunds, unexpected payments
- **Curiosity**: "Unusual activity detected", "You have a message"
- **Trust**: Spoofed logos, realistic design, professional language

## Email Client Testing

To test Ward's email detection:

1. Send test HTML files as email attachments
2. Forward them to yourself
3. Open in Gmail, Proton Mail, Outlook, etc.
4. Verify Ward extracts iframe content correctly
5. Check that email client domain (gmail.com, proton.me) is not flagged

## Notes

- These are **educational examples** for testing only
- Do not use for malicious purposes
- Based on real phishing tactics seen in the wild
- Helps validate Ward's protection capabilities

## Resources

- [Anti-Phishing Working Group](https://apwg.org/)
- [FTC Scam Alerts](https://consumer.ftc.gov/scams)
- [Google Phishing Quiz](https://phishingquiz.withgoogle.com/)
