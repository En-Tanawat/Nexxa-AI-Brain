@echo off
chcp 65001 > nul
echo ====================================================
echo   REXZA AI Voice Robot Controller & Server (Node.js)
echo ====================================================
echo กำลังเปิดเว็บแอปพลิเคชันที่ http://localhost:8000 ...

if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --autoplay-policy=no-user-gesture-required http://localhost:8000
) else if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --autoplay-policy=no-user-gesture-required http://localhost:8000
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --autoplay-policy=no-user-gesture-required http://localhost:8000
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --autoplay-policy=no-user-gesture-required http://localhost:8000
) else (
    start "" http://localhost:8000
)

node server.js
pause
