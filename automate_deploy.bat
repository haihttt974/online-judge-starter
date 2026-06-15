@echo off
setlocal EnableExtensions EnableDelayedExpansion

pushd "%~dp0" || exit /b 1

set "REMOTE=origin"
set "DEPLOY_BRANCH="
set "WORKTREE_BASE=%TEMP%\oj-deploy-%RANDOM%%RANDOM%"
set "WORKTREE_DIR=%WORKTREE_BASE%\repo"

echo ======================================================
echo    ONLINE JUDGE PRO - COMMIT / PUSH / GITHUB PAGES
echo ======================================================
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo [LOI] Thu muc hien tai khong phai git repository.
    goto :fail
)

for /f %%B in ('git rev-parse --abbrev-ref HEAD') do set "DEPLOY_BRANCH=%%B"
if not defined DEPLOY_BRANCH (
    echo [LOI] Khong xac dinh duoc branch hien tai.
    goto :fail
)
if /i "!DEPLOY_BRANCH!"=="HEAD" (
    echo [LOI] Dang o detached HEAD. Hay checkout sang branch truoc khi chay script.
    goto :fail
)

echo [1/4] Kiem tra file staged...
call :HasStaged
if defined HAS_STAGED (
    echo       Da co file staged. Se chi commit nhung file nay.
) else (
    echo       Chua co file staged. Dang add toan bo thay doi hien tai...
    git add -A
    if errorlevel 1 goto :fail

    call :HasStaged
    if not defined HAS_STAGED (
        echo [LOI] Khong co thay doi nao de commit.
        goto :fail
    )
)
echo.

echo [2/4] Nhap commit message:
set /p "COMMIT_MSG=> "
if not defined COMMIT_MSG set "COMMIT_MSG=Update deployment"

git commit -m "%COMMIT_MSG%"
if errorlevel 1 goto :fail

for /f %%H in ('git rev-parse HEAD') do set "COMMIT_SHA=%%H"
echo.
echo -- Da tao commit !COMMIT_SHA!

git push %REMOTE% %DEPLOY_BRANCH%
if errorlevel 1 (
    echo [LOI] Khong the push len remote %REMOTE%/%DEPLOY_BRANCH%.
    goto :cleanup_fail
)
echo -- Push thanh cong.
echo.

echo [3/4] Tao worktree sach tai commit da push...
if exist "%WORKTREE_BASE%" rmdir /s /q "%WORKTREE_BASE%" >nul 2>&1
git worktree add --detach "%WORKTREE_DIR%" !COMMIT_SHA!
if errorlevel 1 goto :cleanup_fail
echo -- Worktree: %WORKTREE_DIR%
echo.

echo [4/4] Deploy GitHub Pages tu commit vua push...
pushd "%WORKTREE_DIR%\client" || goto :cleanup_fail
call npm ci
if errorlevel 1 goto :cleanup_fail_pop
set VITE_DEPLOY_TARGET=gh-pages
call npm run deploy
if errorlevel 1 goto :cleanup_fail_pop
popd

echo.
echo ======================================================
echo    HOAN TAT
echo    - Da commit va push commit !COMMIT_SHA!
echo    - Da deploy GitHub Pages tu commit nay
echo    - Cac file chua stage khong bi dong den
echo ======================================================
echo.

call :CleanupWorktree
popd
pause
exit /b 0

:HasStaged
set "HAS_STAGED="
git diff --cached --name-only | findstr /r "." >nul
if not errorlevel 1 set "HAS_STAGED=1"
exit /b 0

:CleanupWorktree
git worktree remove --force "%WORKTREE_DIR%" >nul 2>&1
if exist "%WORKTREE_BASE%" rmdir /s /q "%WORKTREE_BASE%" >nul 2>&1
exit /b 0

:cleanup_fail_pop
popd >nul 2>&1

:cleanup_fail
call :CleanupWorktree

:fail
popd >nul 2>&1
echo.
echo [LOI] Qua trinh bi dung.
pause
exit /b 1
