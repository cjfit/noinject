// Ward PII Redactor
// Removes sensitive information locally before it leaves the browser

export function redactPII(text) {
  if (!text) return '';

  let redacted = text;

  // 1. Phone Numbers
  // Matches: (123) 456-7890, 123-456-7890, 123.456.7890, +1 123 456 7890
  const phoneRegex = /\b(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})\b/g;
  redacted = redacted.replace(phoneRegex, '[REDACTED_PHONE]');

  // 2. Credit Card Numbers (Simple length check for 13-19 digits with optional spaces/dashes)
  // Note: This might generate false positives for long IDs, but better safe than sorry for cloud mode
  const ccRegex = /\b(?:\d[ -]*?){13,19}\b/g;
  redacted = redacted.replace(ccRegex, (match) => {
    // Verify it looks like a number mainly
    if (match.replace(/[^\d]/g, '').length >= 13) {
      return '[REDACTED_CREDIT_CARD]';
    }
    return match;
  });

  // 3. US SSN
  // Matches: 000-00-0000
  const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
  redacted = redacted.replace(ssnRegex, '[REDACTED_SSN]');

  // 4. IPv4 Addresses (Private IPs are fine, but public ones might identify location)
  const ipRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
  redacted = redacted.replace(ipRegex, '[REDACTED_IP]');

  return redacted;
}
