@echo off
echo Starting Hindalco Tool Tracking Frontend Server...
echo.
echo Frontend will be available at: http://localhost:8000
echo Backend is running at: http://localhost:5000
echo.
echo Press Ctrl+C to stop the server
echo.
python -m http.server 8000
