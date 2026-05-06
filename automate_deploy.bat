@echo off
SETLOCAL EnableDelayedExpansion

echo ======================================================
echo    ONLINE JUDGE PRO - FULL AUTOMATED PIPELINE
echo ======================================================
echo.

:: 1. SAVE CHANGES
echo [1/5] Dang luu trang thai code (Git Add)...
git add .
echo.

:: 2. COMMIT
echo [2/5] Dang tao ban ghi thay doi (Git Commit)...
set /p commit_msg="Nhap loi nhan cho ban cap nhat nay: "
if "%commit_msg%"=="" (
    set commit_msg="Update system: Features, UI and AI Detection"
)
git commit -m "%commit_msg%"
echo.

:: 3. PUSH TO GITHUB (SOURCE CODE)
echo [3/5] DANG DAY CODE LEN GITHUB (Git Push)...
git push origin main
if %ERRORLEVEL% NEQ 0 (
    echo [LOI] Khong the push code len GitHub. Vui long kiem tra ket noi hoac quyen truy cap.
    pause
    exit /b %ERRORLEVEL%
)
echo -- Day code thanh cong!
echo.

:: 4. DEPLOY TO GITHUB PAGES (FRONTEND)
echo [4/5] Dang build va deploy giao dien len GitHub Pages...
cd client
call npm run deploy
cd ..
echo -- Deploy GitHub Pages hoan tat!
echo.

:: 5. DEPLOY TO DOCKER (PRODUCTION SERVER)
echo [5/5] Dang tai-thiet-lap he thong Docker Production...
docker-compose down
docker-compose -f docker-compose.prod.yml up -d --build
echo -- Docker Production dang chay tai port 80!
echo.

echo ======================================================
echo    TAT CA QUY TRINH DA HOAN TAT THANH CONG!
echo    - Source Code: Da push len repository.
echo    - Website (Static): Da deploy len GH Pages.
echo    - Website (Server): Da cap nhat tai localhost:80.
echo ======================================================
echo.
pause
