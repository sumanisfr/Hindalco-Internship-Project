@echo off
title Hindalco Tool Tracking System - Startup

echo ========================================
echo   HINDALCO INDUSTRIES TOOL TRACKING
echo ========================================
echo.
echo Starting the Real-Time Tool Tracking System...
echo.

:: Check if Node.js is installed
echo [1/4] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)
echo ✓ Node.js is installed

:: Check if MongoDB is running
echo.
echo [2/4] Checking MongoDB connection...
cd backend
node test-connection.js >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: MongoDB connection failed
    echo Please ensure MongoDB is running on localhost:27017
    echo.
    echo Do you want to continue anyway? (y/n)
    set /p continue=
    if /i not "%continue%"=="y" exit /b 1
)
echo ✓ MongoDB is accessible

:: Install dependencies if needed
echo.
echo [3/4] Checking dependencies...
if not exist node_modules (
    echo Installing backend dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)
echo ✓ Dependencies are ready

:: Start the backend server
echo.
echo [4/4] Starting backend server...
echo.
echo ========================================
echo   BACKEND SERVER STARTING
echo ========================================
echo.
echo Server will be available at: http://localhost:5000
echo Frontend will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

:: Start the server
node server.js

pause
