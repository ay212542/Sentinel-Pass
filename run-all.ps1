# 1. Close any existing node processes
Stop-Process -Name "node" -ErrorAction SilentlyContinue

Write-Host "Starting Server in a new window..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

Write-Host "Waiting 5 seconds for server..."
Start-Sleep -Seconds 5

Write-Host "Running Test Script..."
node test-api.js

Write-Host "Done! Check the other window for server logs."
