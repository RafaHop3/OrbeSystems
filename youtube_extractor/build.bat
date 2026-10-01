@echo off
echo ==============================================
echo Orbe Systems YT Extractor Builder
echo ==============================================
echo Compiling python app to .exe using pyinstaller...
pyinstaller --noconfirm --onedir --windowed --name "OrbeMP3Extractor" "extractor.py"
echo Build Complete! Check the 'dist' folder.
pause
