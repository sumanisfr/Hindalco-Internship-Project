Write-Host "Starting Hindalco Tool Tracking Frontend Server..." -ForegroundColor Green
Write-Host ""
Write-Host "Frontend will be available at: http://localhost:8000" -ForegroundColor Yellow
Write-Host "Backend is running at: http://localhost:5000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Cyan
Write-Host ""

# Start the HTTP server
python -m http.server 8000
