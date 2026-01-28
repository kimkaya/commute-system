@echo off
chcp 65001 >nul
echo ====================================
echo   출퇴근 ERP 전체 빌드 스크립트
echo ====================================
echo.

:: 관리자 UI 빌드
echo [1/3] 관리자 UI 빌드 중...
cd /d "D:\xamp\htdocs\commute-erp\apps\admin-ui"
call npm install
call npm run electron:build
if %ERRORLEVEL% neq 0 (
    echo 관리자 UI 빌드 실패!
    pause
    exit /b 1
)
echo 관리자 UI 빌드 완료!
echo.

:: 키오스크 빌드
echo [2/3] 키오스크 빌드 중...
cd /d "D:\xamp\htdocs\commute-erp\apps\kiosk"
call npm install
call npm run electron:build
if %ERRORLEVEL% neq 0 (
    echo 키오스크 빌드 실패!
    pause
    exit /b 1
)
echo 키오스크 빌드 완료!
echo.

:: 직원 포털 빌드
echo [3/3] 직원 포털 빌드 중...
cd /d "D:\xamp\htdocs\commute-erp\apps\employee-portal"
call npm install
call npm run electron:build
if %ERRORLEVEL% neq 0 (
    echo 직원 포털 빌드 실패!
    pause
    exit /b 1
)
echo 직원 포털 빌드 완료!
echo.

echo ====================================
echo   전체 빌드 완료!
echo ====================================
echo.
echo 설치 파일 위치:
echo   - 관리자 UI: apps\admin-ui\release\
echo   - 키오스크: apps\kiosk\release\
echo   - 직원 포털: apps\employee-portal\release\
echo.
pause
