# NoInject Setup Guide

Quick guide to get NoInject up and running.

## Prerequisites

Before installing NoInject, you need to enable Chrome's Prompt API and download the Gemini Nano model.

### Step 1: Enable Chrome Flags

1. Open Chrome (Canary or Dev channel recommended)
2. Navigate to `chrome://flags`
3. Search for and enable these flags:
   - **Prompt API for Gemini Nano**: Set to `Enabled`
   - **Optimization Guide On Device Model**: Set to `Enabled BypassPerfRequirement`
4. Click "Relaunch" to restart Chrome

### Step 2: Download Gemini Nano Model

1. Navigate to `chrome://components`
2. Find "Optimization Guide On Device Model"
3. Click "Check for Update"
4. Wait for download to complete (this will take several minutes - the model is ~2.5GB)
5. Verify status shows a recent version number

### Step 3: Verify Prompt API is Ready

1. Open a new tab
2. Open DevTools (F12)
3. Go to Console tab
4. Type: `await ai.languageModel.availability()`
5. Expected result: `"readily"` or `"after-download"`

If you see `"no"`, check that:
- You're using Chrome 128+ (Canary/Dev)
- Both flags are enabled
- You've restarted Chrome after enabling flags
- The model downloaded successfully

## Extension Installation

### Method 1: Load Unpacked Extension (Development)

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Navigate to and select the `noinject` directory
6. The extension icon should appear in your toolbar

### Method 2: Generate PNG Icons (Required)

The extension needs PNG icon files. You have two options:

**Option A: Convert SVG to PNG Online**

1. Open `icons/icon-safe.svg` and `icons/icon-danger.svg`
2. Use an online converter like https://svgtopng.com/
3. Convert each to PNG at these sizes: 16x16, 32x32, 48x48, 128x128
4. Save them as:
   - `icons/icon-safe-16.png`, `icons/icon-safe-32.png`, etc.
   - `icons/icon-danger-16.png`, `icons/icon-danger-32.png`, etc.

**Option B: Use Design Tool**

1. Open `icons/icon-safe.svg` and `icons/icon-danger.svg` in Figma/Sketch/Illustrator
2. Export as PNG at each required size
3. Follow naming convention above

## Testing the Extension

### Quick Test with Test Page

1. Open `test-page.html` in Chrome (or serve it locally)
2. The page contains intentional prompt injection examples
3. NoInject should:
   - Show a red badge on the extension icon
   - Display a warning banner at the top of the page
   - Show "Prompt Injection Detected" in the popup
4. Click the extension icon to see the AI's analysis

### Manual Testing

1. Visit any website
2. Extension will automatically scan the page
3. Check results:
   - Green icon = Safe
   - Red icon with "!" = Threat detected
4. Click icon to see detailed analysis

## Troubleshooting

### "AI not available" Error

**Cause**: Gemini Nano model not downloaded or Prompt API not enabled

**Solutions**:
- Verify flags are enabled at `chrome://flags`
- Check model downloaded at `chrome://components`
- Restart Chrome after enabling flags
- Ensure you have 22GB free storage space

### Extension Icon Missing

**Cause**: PNG icon files not present

**Solution**:
- Generate PNG icons from SVG files (see above)
- Ensure files are named correctly
- Reload the extension at `chrome://extensions`

### No Warning on Test Page

**Possible causes**:
1. AI detection failed → Check console for errors
2. Content script not loaded → Refresh the page
3. Pattern fallback disabled → Check settings

**Debug steps**:
1. Open DevTools Console (F12)
2. Look for NoInject log messages
3. Check for any red error messages
4. Try clicking "Rescan" in the extension popup

### "Analysis failed" Message

**Cause**: AI session creation or prompt execution failed

**Solutions**:
- Check `chrome://on-device-internals` for AI status
- Ensure Gemini Nano is running
- Try restarting Chrome
- Check browser console for detailed error messages

### High Memory Usage

**Normal**: Extension uses ~100MB including the AI model
**Issue**: If usage is much higher, try:
- Clearing the extension cache (uninstall/reinstall)
- Reducing scan frequency in settings
- Checking for memory leaks in browser console

## Development Setup

### Running in Development Mode

1. Load extension as unpacked (see above)
2. Make code changes
3. Go to `chrome://extensions`
4. Click the refresh icon on NoInject card
5. Test changes

### Viewing Logs

1. Go to `chrome://extensions`
2. Find NoInject
3. Click "service worker" link (under "Inspect views")
4. Console will show background script logs

### Testing Content Script

1. Open any web page
2. Open DevTools (F12)
3. Go to Console
4. Look for "Analyzing X characters of content..." messages

## Next Steps

1. **Configure Settings**: Click extension → Settings
2. **Test on Real Sites**: Browse normally and check for detections
3. **Report Issues**: If you find bugs or false positives, open an issue
4. **Customize**: Adjust detection sensitivity in settings

## System Requirements Reminder

- **OS**: Windows 10/11, macOS 13+, Linux, ChromeOS 16389+
- **Storage**: 22GB free space
- **RAM**: 16GB (or 4GB VRAM for GPU)
- **Network**: Unmetered for initial download

## Support

- **Documentation**: See README.md for full documentation
- **Issues**: Report bugs on GitHub
- **Testing**: Use test-page.html to verify functionality

---

**Ready to go!** NoInject is now protecting you from prompt injection attacks.
