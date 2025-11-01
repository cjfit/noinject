# Send HTML Email Script

Send HTML emails via Gmail using Python (no external dependencies needed!).

## Setup Instructions

### 1. Enable Gmail App Password

You **cannot** use your regular Gmail password for SMTP. You need an App Password:

1. Go to https://myaccount.google.com/security
2. **Enable 2-Step Verification** (required for App Passwords)
3. Search for "App passwords" or go to https://myaccount.google.com/apppasswords
4. Select "Mail" as the app and your device
5. Google will generate a 16-character password - **save this!**

### 2. Configure Credentials

Create a `.env` file in the `scripts/` directory:

```bash
cd scripts/
cp .env.example .env
```

Edit `.env` with your credentials:

```
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
```

**Important:** The `.env` file is gitignored for security.

### 3. Run the Script

```bash
python scripts/send-email.py <recipient> <subject> <html-file>
```

**Example:**

```bash
python scripts/send-email.py user@example.com "Test Email" test-sites/fake-bank-2fa-urgency.html
```

## How It Works

The script uses Python's built-in libraries (no pip install needed):

- `smtplib` - SMTP protocol client
- `email.mime.multipart` - Create multipart email messages
- `email.mime.text` - Create HTML/text email parts
- `email.mime.image` - Embed images inline

These are part of Python's standard library, so the script works out of the box!

### Image Embedding

The script **automatically embeds images** referenced in your HTML:

- Finds all `<img src="...">` tags in your HTML
- Embeds local images (`.png`, `.jpg`, etc.) as inline attachments
- Converts relative paths like `./unnamed.png` to `cid:` references
- Skips external URLs (images with `http://`, `https://`, or `data:` URIs)

**Example:** If your HTML has `<img src="./logo.png">`, the script will:
1. Find `logo.png` in the same directory as the HTML file
2. Embed it as an inline MIME attachment
3. Replace the src with `cid:image0` so it displays correctly

This ensures images appear in the email without requiring external hosting!

## Troubleshooting

**Authentication Error:**
- Make sure you're using an **App Password**, not your regular Gmail password
- Verify 2-Step Verification is enabled on your Google account

**File Not Found:**
- Check the HTML file path is correct
- Use relative or absolute paths

**Connection Error:**
- Check your internet connection
- Gmail SMTP uses `smtp.gmail.com` on port `587` with STARTTLS
