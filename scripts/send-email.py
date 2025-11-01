#!/usr/bin/env python3

"""
Send HTML Email via Gmail

Requirements:
1. Python 3.x (built-in libraries - no pip install needed!)
2. Gmail account with App Password enabled
3. Create .env file with credentials (see .env.example in scripts/)

Usage:
    python scripts/send-email.py <recipient> <subject> <html-file>
    python scripts/send-email.py user@example.com "Test Email" test-sites/fake-bank-2fa-urgency.html
"""

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
import sys
import os
import re
from pathlib import Path

def load_env():
    """Load environment variables from .env file"""
    env_path = Path(__file__).parent / '.env'
    env_vars = {}

    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()

    return env_vars

def find_images_in_html(html_content, html_dir):
    """Find all image references in HTML and return paths"""
    # Find all img src attributes
    img_pattern = r'<img[^>]+src=["\'](.*?)["\']'
    matches = re.findall(img_pattern, html_content, re.IGNORECASE)

    images = []
    for img_src in matches:
        # Skip external URLs (http://, https://, //, data:)
        if img_src.startswith(('http://', 'https://', '//', 'data:')):
            continue

        # Resolve relative path
        img_path = html_dir / img_src.lstrip('./')
        if img_path.exists():
            images.append({
                'original_src': img_src,
                'path': img_path,
                'filename': img_path.name
            })

    return images

def send_email(to, subject, html_file_path):
    """Send HTML email via Gmail with embedded images"""

    # Load environment variables
    env = load_env()

    # Get credentials
    gmail_user = env.get('GMAIL_USER') or os.environ.get('GMAIL_USER')
    gmail_app_password = env.get('GMAIL_APP_PASSWORD') or os.environ.get('GMAIL_APP_PASSWORD')

    if not gmail_user or not gmail_app_password:
        print("✗ Error: Gmail credentials not configured")
        print("\nPlease create a .env file in the scripts/ directory with:")
        print("GMAIL_USER=your-email@gmail.com")
        print("GMAIL_APP_PASSWORD=your-app-password")
        print("\nTo get an App Password:")
        print("1. Go to https://myaccount.google.com/security")
        print("2. Enable 2-Step Verification if not already enabled")
        print("3. Search for 'App passwords' and create one for 'Mail'")
        sys.exit(1)

    # Read HTML file
    html_path = Path(html_file_path)
    if not html_path.exists():
        print(f"✗ Error: HTML file not found: {html_file_path}")
        sys.exit(1)

    html_dir = html_path.parent

    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    # Find images in HTML
    images = find_images_in_html(html_content, html_dir)

    # Replace image src with cid: references for inline embedding
    for idx, img in enumerate(images):
        cid = f"image{idx}"
        img['cid'] = cid
        # Replace src in HTML with cid reference
        html_content = html_content.replace(
            f'src="{img["original_src"]}"',
            f'src="cid:{cid}"'
        ).replace(
            f"src='{img['original_src']}'",
            f'src="cid:{cid}"'
        )

    # Create message with related parts for inline images
    msg = MIMEMultipart('related')
    msg['Subject'] = subject
    msg['From'] = gmail_user
    msg['To'] = to

    # Attach HTML content
    msg_alternative = MIMEMultipart('alternative')
    msg.attach(msg_alternative)
    html_part = MIMEText(html_content, 'html')
    msg_alternative.attach(html_part)

    # Attach images
    for img in images:
        with open(img['path'], 'rb') as f:
            img_data = f.read()
            image = MIMEImage(img_data)
            image.add_header('Content-ID', f'<{img["cid"]}>')
            image.add_header('Content-Disposition', 'inline', filename=img['filename'])
            msg.attach(image)
        print(f"  ✓ Embedded image: {img['filename']}")

    # Send email
    try:
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(gmail_user, gmail_app_password)
            server.send_message(msg)

        print("✓ Email sent successfully!")
        print(f"  From: {gmail_user}")
        print(f"  To: {to}")
        print(f"  Subject: {subject}")
        print(f"  HTML file: {html_file_path}")
        if images:
            print(f"  Images embedded: {len(images)}")

    except smtplib.SMTPAuthenticationError:
        print("✗ Authentication failed!")
        print("\nMake sure you're using an App Password, not your regular Gmail password.")
        print("Get one at: https://myaccount.google.com/apppasswords")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Failed to send email: {e}")
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: python send-email.py <recipient> <subject> <html-file>")
        print('Example: python send-email.py user@example.com "Test Email" test-sites/fake-bank-2fa-urgency.html')
        sys.exit(1)

    recipient = sys.argv[1]
    subject = sys.argv[2]
    html_file = sys.argv[3]

    send_email(recipient, subject, html_file)
