@echo off
echo CallTranslate - Installer
echo ===========================
echo.
echo Installing dependencies...
call npm install
echo.
echo Setup complete! 
echo.
echo To complete the configuration (Admin user, API keys, etc.):
echo 1. Run run.bat to start the application.
echo 2. Follow the "Setup Wizard" in your browser.
echo.
echo. > .installed
pause
