@echo off
REM EPROHORI FINAL LAUNCH - Windows Version
REM All-in-One Deployment Script

cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║         EPROHORI FINAL LAUNCH - AUTOMATED SCRIPT          ║
echo ║              Windows Version - All Steps                   ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Step 1: Check if PNG icons exist
echo STEP 1: Checking PNG icons...
if exist "extension\icons\icon-16.png" (
    if exist "extension\icons\icon-48.png" (
        if exist "extension\icons\icon-128.png" (
            echo ✅ All PNG icons found!
            echo.
            goto STEP2
        )
    )
)

echo ❌ PNG icons not found!
echo.
echo REQUIRED ACTION:
echo 1. Go to: https://convertio.co/svg-png/
echo 2. Upload: extension\icons\icon.svg
echo 3. Generate 3 PNG files:
echo    - 16x16 ^> icon-16.png
echo    - 48x48 ^> icon-48.png
echo    - 128x128 ^> icon-128.png
echo 4. Save to: extension\icons\
echo.
echo After generating icons, run this script again!
pause
exit /b 1

:STEP2
REM Step 2: Commit PNG icons
echo STEP 2: Committing PNG icons to GitHub...
git add extension\icons\icon-*.png
git commit -m "chore: add chrome extension PNG icons (16x48x128px) - final submission ready"
if %errorlevel% equ 0 (
    echo ✅ Committed to GitHub
) else (
    echo ⚠️  No changes to commit (icons already committed)
)
echo.

REM Step 3: Create ZIP package
echo STEP 3: Creating ZIP package for Chrome Web Store...
if exist "EProhori-Extension-v1.0.zip" (
    del "EProhori-Extension-v1.0.zip"
    echo ⚠️  Removed old ZIP file
)

cd extension
powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('%cd%', '..\EProhori-Extension-v1.0.zip')"
cd ..

if exist "EProhori-Extension-v1.0.zip" (
    echo ✅ Created: EProhori-Extension-v1.0.zip
    for %%A in ("EProhori-Extension-v1.0.zip") do echo    Size: %%~zA bytes
) else (
    echo ❌ Failed to create ZIP
    pause
    exit /b 1
)
echo.

REM Step 4: Verify ZIP exists
echo STEP 4: Verifying ZIP package...
if exist "EProhori-Extension-v1.0.zip" (
    echo ✅ ZIP package verified!
) else (
    echo ❌ ZIP not found!
    pause
    exit /b 1
)
echo.

REM Step 5: Final message
cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║       READY FOR CHROME WEB STORE SUBMISSION!               ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo 📦 SUBMISSION FILE CREATED:
echo    EProhori-Extension-v1.0.zip
echo.
echo 📋 NEXT STEPS (Manual):
echo.
echo 1️⃣  Go to: https://chrome.google.com/webstore/devconsole
echo.
echo 2️⃣  Sign in with your Google account
echo.
echo 3️⃣  Click: "New item"
echo.
echo 4️⃣  Upload: EProhori-Extension-v1.0.zip
echo.
echo 5️⃣  Fill in details:
echo     Name: EProhori - Threat Detector
echo     Short desc: Real-time SMS scam ^& phishing detection
echo     Category: Tools
echo     Language: English
echo.
echo 6️⃣  Submit for review
echo.
echo 7️⃣  Wait for approval (1-3 days) ⏳
echo.
echo 🎉  Extension LIVE on Chrome Web Store! 🚀
echo.
echo ════════════════════════════════════════════════════════════
echo.
echo ✨ EProhori ready to protect Bangladesh! 🇧🇩
echo.
pause
