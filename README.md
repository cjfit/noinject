# Ward - Consumer Protection Shield

<div align="center">
  <img src="icons/ward-shield.png" width="128" height="128" alt="Ward Logo">

  **Protect yourself from phishing, scams, and online threats**

  [![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-green?style=flat&logo=google-chrome)](https://chrome.google.com/webstore)
  [![License](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
</div>

## Demo Video
[![Ward Demo](https://img.youtube.com/vi/Br_3D5ZlGkk/0.jpg)](https://www.youtube.com/watch?v=Br_3D5ZlGkk)

## Quickstart
1. Clone the repo
2. Open Chrome → `chrome://extensions`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" → Select the project folder
5. Navigate to any website to see Ward in action (for testing, go to your spam email box or if you're feeling very daring visit online known malicious sites from abuse.ch:
   https://urlhaus.abuse.ch/browse.php?search=url_status:online&page=1
6. To see Ward scanning details, click the red shield icon in your Chrome extensions toolbar.
> Scan failed? Click the "rescan" button in the Ward extensions toolbar to retry.

## Overview

Ward is a Chrome extension that protects consumers from phishing emails, scam websites, and online threats using on-device AI (Gemini Nano). Like a personal security guard for your browser, Ward analyzes web content in real-time to detect suspicious activity before you fall victim.

### The Problem

Online scams and phishing attacks are evolving faster than traditional blocklists can keep up with:
- **Phishing emails** disguised as banks, payment processors, or trusted companies
- **Fake urgency** tactics pressuring you to act immediately
- **Brand impersonation** that looks legitimate at first glance
- **New scam sites** that haven't been reported yet

Traditional security relies on known threat databases. By the time a scam is reported and added to blocklists, thousands of victims have already been targeted.

### The Solution

Ward uses on-device AI to analyze content intelligently, detecting scam patterns even on brand-new threats never seen before. Like an SSL certificate warning for bad actors, Ward alerts you when something looks suspicious.

## Features

- **On-Device AI Detection** - Uses Chrome's Prompt API (Gemini Nano) for intelligent, privacy-preserving analysis
- **Two-Stage Analysis** - Analyzer classifies content, Judge validates the decision
- **Real-time Scanning** - Automatically scans pages and emails as they load
- **Email Client Support** - Detects phishing in Gmail, Proton Mail, Outlook, and more
- **Visual Warnings** - Clean warning banners with detailed threat explanations
- **Brand Impersonation Detection** - Identifies when companies are being impersonated
- **Zero Server Requests** - All processing happens on your device

## What Ward Detects

Ward protects you from:

1. **Phishing Emails**
   - Fake bank notifications
   - Suspicious payment requests
   - Account verification scams
   - 2FA/MFA urgency tactics

2. **Scam Websites**
   - Fake login pages
   - Fraudulent shopping sites
   - Tech support scams
   - Prize/lottery scams

3. **Social Engineering**
   - Urgency and pressure tactics
   - Authority impersonation
   - Too-good-to-be-true offers
   - Threats of account suspension

4. **Brand Impersonation**
   - Companies being faked
   - Mismatched sender domains
   - Suspicious link destinations

## Requirements

### System Requirements

- **Operating System**: Windows 10/11, macOS 13+, Linux, or ChromeOS 16389.0.0+
- **Browser**: Chrome 128+ (Canary/Dev recommended)
- **Storage**: 22 GB free space for Gemini Nano model
- **Memory**: 16 GB RAM (or 4+ GB VRAM for GPU)
- **Network**: Unmetered connection for initial model download

### Enable Prompt API

1. Open `chrome://flags`
2. Enable the following flags:
   - `#optimization-guide-on-device-model` → **Enabled BypassPerfRequirement**
   - `#prompt-api-for-gemini-nano` → **Enabled**
3. Restart Chrome
4. Visit `chrome://components`
5. Find "Optimization Guide On Device Model" and click "Check for Update"
6. Wait for download to complete (~22 GB)

## Installation

### Method 1: Load Unpacked (Development)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the project directory
6. The extension should now be installed

### Method 2: Chrome Web Store (Coming Soon)

Once published, install directly from the Chrome Web Store.

## Usage

### Basic Usage

1. Click the Ward icon in your Chrome toolbar
2. Navigate to any website or open an email
3. The extension automatically scans the page
4. Check the popup for scan results:
   - **Green checkmark** - Content appears safe
   - **Red warning** - Threat detected

### Understanding Results

When a threat is detected:
- The extension icon shows a red badge with "!"
- A warning banner appears at the top of the page
- Click the extension to view detailed analysis
- The AI explains what red flags were identified

### Managing False Positives

If Ward flags legitimate content:
- Click "Ignore This URL" to skip the specific page
- Click "Ignore Domain" to trust the entire website
- Manage ignore rules in Settings

## Architecture

### Two-Stage AI Detection

**Stage 1: Analyzer**
- Classifies content as SAFE, SCAM, or SUSPICIOUS
- Identifies specific red flags and patterns
- Provides reasoning for the classification

**Stage 2: Judge**
- Reviews the analyzer's classification
- Makes final binary THREAT or SAFE decision
- Focuses on brand impersonation verification
- Outputs structured judgment with recommendations

### Components

```
ward/
├── manifest.json              # Extension configuration
├── background.js              # Service worker, caching, icon management
├── content.js                 # Page content extraction, iframe support
├── popup.html/css/js         # Extension popup UI
├── settings.html/js          # Settings page
├── modes/everyday/
│   └── detector.js           # Two-stage AI detection logic
├── test-sites/               # Test phishing pages
└── icons/                    # Extension icons
```

### Content Extraction

The content script extracts:
- All visible text from the DOM
- Email message bodies (from iframes in email clients)
- Hyperlinks with context
- Form fields and buttons

Content is trimmed to fit Gemini Nano's context window.

## Privacy

- **No data leaves your device** - All analysis happens locally
- **No tracking** - No analytics or telemetry
- **No account required** - Works completely offline after model download
- **No external API calls** - Everything runs in your browser

## Performance

- **Initial scan**: 5-10 seconds (two-stage AI analysis)
- **Cached results**: Instant (pages scanned recently)
- **Memory usage**: ~100MB (including AI model)
- **Battery impact**: Minimal (on-device inference is efficient)

## Development

### Project Structure

```javascript
// modes/everyday/detector.js - Main AI logic
- initializeEverydayMode()    // Set up analyzer & judge sessions
- analyzeEveryday()           // Two-stage analysis pipeline

// content.js - Content extraction
- extractVisibleContent()     // Get all visible text + iframes
- extractVisibleLinks()       // Get hyperlinks with context
- showWarningBanner()         // Display threat warnings

// background.js - Orchestration
- analyzePage()               // Coordinate analysis
- DETECTION_CACHE             // Cache results
- Tab state management        // Track analysis per tab
```

### Testing

Test sites are available in `test-sites/`:
- `fake-bank-2fa-urgency.html` - Phishing email example
- `chase-login.html` - Fake login page

### Adding Test Cases

Create HTML files in `test-sites/` with realistic phishing scenarios to test detection.

## Judging Criteria Alignment

### Functionality
- **Scalable**: Works on any website, email client, language, or content type
- **API Usage**: Advanced two-stage Prompt API implementation
- **Global**: Protects users worldwide, no region restrictions

### Purpose
- **Meaningful**: Solves a critical consumer safety problem
- **New Capability**: First on-device AI phishing detector
- **Previously Impractical**: Only possible with local AI inference

### Content
- **Creative**: Novel two-stage validation approach
- **Visual Quality**: Clean, security-focused UI design

### User Experience
- **Well Executed**: Automatic protection with clear warnings
- **Easy to Use**: Zero configuration, works immediately

### Technological Execution
- **Advanced API Usage**: Dual AI sessions with role-specific prompts
- **Sophisticated Prompting**: Context-aware system prompts
- **Innovative**: Brand impersonation verification system

## Known Limitations

- Requires 22GB storage for Gemini Nano model
- Initial model download requires unmetered connection
- May have false positives on security training/testing content
- Limited to content visible in browser

## Roadmap

- [ ] Advanced ignore rule management
- [ ] Detection report export
- [ ] Link preview before clicking
- [ ] Real-time form monitoring
- [ ] Multi-language support optimization
- [ ] Performance improvements

## Contributing

Contributions welcome! Areas for improvement:
- Additional test cases (phishing examples)
- Better content extraction heuristics
- UI/UX enhancements
- Performance optimizations
- Internationalization

## License

AGPL-3.0 License - See LICENSE file for details

## Acknowledgments

- Built with Chrome's [Prompt API](https://developer.chrome.com/docs/ai/built-in-apis)
- Inspired by consumer protection and anti-phishing research
- Icon design: Roman shield for protection

## Support

- **Issues**: Report bugs and issues
- **Documentation**: See inline code comments
- **Testing**: Use test-sites/ for validation

---

<div align="center">

**Stay safe from phishing and scams. Use Ward.**

[View Test Sites](test-sites/) • [Report Issue](#)

</div>
