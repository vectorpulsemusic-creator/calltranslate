@echo off
echo CallTranslate - Starting...
echo ===========================
echo.

if not exist .installed (
    echo First run detected. Running installer...
    call install.bat
)

if not exist node_modules (
    echo node_modules not found. Installing...
    call npm install
)

echo Starting development server...
npm run dev
pause
