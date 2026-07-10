# EProhori Chrome Extension

Real-time threat detection for SMS scams, phishing, and fraud in Bangladesh.

## Quick Start

1. **Load in Chrome:**
   ```
   chrome://extensions/
   → Enable "Developer mode"
   → Load unpacked
   → Select /extension folder
   ```

2. **Test:**
   - Click extension icon
   - Paste suspicious message
   - Click "বিশ্লেষণ করুন" (Analyze)
   - See threat analysis

## Features

✅ Real-time threat detection (Groq + Gemini AI)
✅ Blocklist checking (old feature)
✅ Phishing pattern recognition
✅ Bengali language support
✅ One-click threat reporting
✅ Suspicious link highlighting
✅ Analysis history

## Extension Files

```
extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (blocklist, reporting)
├── popup.html            # Extension popup UI
├── popup.js              # Popup logic
├── content.js            # Page content detection
├── icons/
│   ├── icon.svg          # Vector icon
│   ├── icon-16.png       # 16x16 pixels
│   ├── icon-48.png       # 48x48 pixels
│   └── icon-128.png      # 128x128 pixels
└── README.md
```

## Icon Generation

Replace PNG icons with actual 16x16, 48x48, 128x128 PNG files:

**Option 1: Use online converter**
- Convert `icon.svg` to PNG at https://convertio.co/svg-png/
- Generate three sizes: 16x16, 48x48, 128x128

**Option 2: Use Figma**
1. Open Figma.com
2. Upload icon.svg
3. Export at 1x (16x16), 3x (48x48), 8x (128x128)

**Option 3: Use ImageMagick (Windows)**
```powershell
# Install ImageMagick if not present
magick convert -background none icon.svg -resize 16x16 icons/icon-16.png
magick convert -background none icon.svg -resize 48x48 icons/icon-48.png
magick convert -background none icon.svg -resize 128x128 icons/icon-128.png
```

## Upload to Chrome Web Store

1. **Register as Developer:**
   - Go to https://chrome.google.com/webstore/devconsole
   - Sign in with Google account
   - Pay $5 one-time developer fee

2. **Create ZIP Package:**
   ```
   Zip all files in /extension folder:
   - manifest.json
   - background.js
   - popup.html
   - popup.js
   - content.js
   - icons/ (with PNG files)
   ```

3. **Upload:**
   - Click "New item"
   - Upload ZIP file
   - Fill in:
     - **Name:** EProhori - Threat Detector
     - **Short description:** Real-time SMS scam & phishing detection
     - **Detailed description:** See below
     - **Category:** Tools
     - **Language:** English
     - **Permissions justification:** See manifest.json

4. **Detailed Description:**
   ```
   EProhori is a real-time threat detection extension for Bangladesh.
   
   Features:
   - Detects phishing, SMS scams, and fraud attempts
   - Analyzes suspicious messages using AI (Groq + Gemini)
   - Highlights dangerous links on web pages
   - One-click threat reporting
   - Supports Bengali and English
   - Works on: Gmail, WhatsApp Web, Facebook, Telegram, Twitter
   
   How it works:
   1. Click the extension icon
   2. Paste a suspicious message/URL
   3. Get instant threat analysis
   4. See prevention tips
   5. Report to help others
   
   100% free. No ads. Made for Bangladesh.
   Visit: https://eprohori.tech
   ```

5. **Screenshots:**
   - Screenshot 1: Analysis input screen
   - Screenshot 2: Phishing warning display
   - Screenshot 3: Link highlighting in Gmail

6. **Icon:**
   - Use icons/icon-128.png

7. **Review:**
   - Chrome team reviews (takes 1-3 days)
   - Will be live on Chrome Web Store

## Platforms Supported

✅ Gmail / Google Mail
✅ WhatsApp Web
✅ Facebook
✅ Twitter / X
✅ Telegram
✅ Instagram
✅ All websites (link highlighting)

## Privacy

- Messages are analyzed by AI (Groq/Gemini)
- Data sent to EProhori API for threat checking
- No data stored permanently
- No third-party tracking

## License

MIT License - See LICENSE file

## Support

- Website: https://eprohori.tech
- Email: eprohoribd@gmail.com
- GitHub: https://github.com/NiloySec/Eprohori

---

**Ready to upload? Follow the steps above!** 🚀
