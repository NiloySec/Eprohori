# Icon Generation Guide for Chrome Web Store

## Quick Start (Online Tool - Easiest)

1. **Go to:** https://convertio.co/svg-png/
2. **Upload:** `icons/icon.svg`
3. **Generate PNG files** at these sizes:
   - 16x16 pixels → `icons/icon-16.png`
   - 48x48 pixels → `icons/icon-48.png`
   - 128x128 pixels → `icons/icon-128.png`

**Time:** 2 minutes ⚡

---

## Alternative: Using ImageMagick (Windows/Mac/Linux)

### Windows (via Chocolatey)
```powershell
# Install ImageMagick (one-time)
choco install imagemagick

# Then run from extension/icons folder:
cd extension\icons
magick convert -background none icon.svg -resize 16x16 icon-16.png
magick convert -background none icon.svg -resize 48x48 icon-48.png
magick convert -background none icon.svg -resize 128x128 icon-128.png
```

### Mac (via Homebrew)
```bash
# Install ImageMagick
brew install imagemagick

# Then run:
cd extension/icons
convert -background none icon.svg -resize 16x16 icon-16.png
convert -background none icon.svg -resize 48x48 icon-48.png
convert -background none icon.svg -resize 128x128 icon-128.png
```

### Linux
```bash
# Install
sudo apt-get install imagemagick

# Run (same as Mac)
convert -background none icon.svg -resize 16x16 icon-16.png
convert -background none icon.svg -resize 48x48 icon-48.png
convert -background none icon.svg -resize 128x128 icon-128.png
```

---

## Using Figma (Professional)

1. Go to https://figma.com
2. Create a new file
3. File → Import → Upload `icon.svg`
4. Select layers and export:
   - Right-click → Export
   - Set format: PNG
   - Generate at: 1x (16x16), 3x (48x48), 8x (128x128)
5. Download and place in `icons/` folder

---

## Files Needed

Once generated, you should have:
```
extension/icons/
├── icon.svg          ✓ (exists)
├── icon-16.png       ⏳ (to generate)
├── icon-48.png       ⏳ (to generate)
└── icon-128.png      ⏳ (to generate)
```

---

## Next: Create ZIP for Chrome Web Store

Once you have all PNG icons:

1. **Create a ZIP file** with ALL extension files:
   ```
   EProhori-Extension-v1.0.zip
   ├── manifest.json
   ├── background.js
   ├── popup.html
   ├── popup.js
   ├── content.js
   ├── icons/
   │   ├── icon-16.png
   │   ├── icon-48.png
   │   ├── icon-128.png
   │   └── icon.svg
   ├── package.json
   └── README.md
   ```

2. **Upload to Chrome Web Store:**
   - Go: https://chrome.google.com/webstore/devconsole
   - Click "New item"
   - Upload ZIP
   - Fill details & submit

---

## Timing

- **Icon generation:** 2-5 min (online tool)
- **ZIP creation:** 1 min
- **Chrome Web Store upload:** 5-10 min
- **Review period:** 1-3 days (Google)

**Total time to live: ~1 hour (excluding review)** ⚡

---

## Support

If icons don't look right:
- Ensure they're 256-color PNGs (not 32-bit)
- Use transparent background (#00000000)
- Keep aspect ratio (square, 1:1)
- File size <10KB each

Questions? See README.md for full documentation.
