#!/bin/bash
# Run this AFTER you've generated and saved the 3 PNG icon files

echo "🎨 POST-ICON GENERATION SCRIPT"
echo "=============================="
echo ""

# Step 1: Verify icons exist
echo "Step 1: Verifying icons..."
if [ -f "icons/icon-16.png" ] && [ -f "icons/icon-48.png" ] && [ -f "icons/icon-128.png" ]; then
    echo "✅ All 3 icons found!"
    ls -lh icons/icon-*.png
else
    echo "❌ Missing icons! Generate them first at: https://convertio.co/svg-png/"
    exit 1
fi

echo ""
echo "Step 2: Creating ZIP package..."
cd ..
zip -r EProhori-Extension-v1.0.zip extension/
echo "✅ ZIP created: EProhori-Extension-v1.0.zip"

echo ""
echo "Step 3: Committing to GitHub..."
git add extension/icons/icon-*.png
git commit -m "chore: add chrome extension icons (16x48x128px)"
git push origin main
echo "✅ Pushed to GitHub"

echo ""
echo "=============================="
echo "🎉 READY FOR CHROME WEB STORE!"
echo "=============================="
echo ""
echo "Next: Upload to Chrome Web Store"
echo "URL: https://chrome.google.com/webstore/devconsole"
echo ""
echo "File to upload: EProhori-Extension-v1.0.zip"
