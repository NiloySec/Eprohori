#!/bin/bash
# Convert SVG to PNG icons (3 sizes for Chrome Web Store)

# Install ImageMagick if not present
# Windows: choco install imagemagick
# Mac: brew install imagemagick
# Linux: sudo apt-get install imagemagick

echo "🎨 Converting EProhori logo to PNG icons..."

# Convert icon.svg to PNG (3 different sizes)
magick convert -background none "icon.svg" -resize 16x16 -colors 256 "icon-16.png"
echo "✓ Created icon-16.png (16x16)"

magick convert -background none "icon.svg" -resize 48x48 -colors 256 "icon-48.png"
echo "✓ Created icon-48.png (48x48)"

magick convert -background none "icon.svg" -resize 128x128 -colors 256 "icon-128.png"
echo "✓ Created icon-128.png (128x128)"

echo ""
echo "✅ All icons generated! Ready for Chrome Web Store"
echo ""
echo "Files created:"
ls -lh icon-*.png
