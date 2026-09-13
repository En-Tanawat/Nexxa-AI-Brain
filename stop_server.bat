@echo off
chcp 65001 > nul
echo กำลังหยุดเซิร์ฟเวอร์ Rexza Robot Node.js...
powershell -NoProfile -Command "Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*server.js*' } | Stop-Process -Force"
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do taskkill /f /pid %%a >nul 2>&1
echo เซิร์ฟเวอร์หยุดทำงานเรียบร้อยแล้ว.
pause
