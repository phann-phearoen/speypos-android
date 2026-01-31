# 1. Kill all existing Chrome processes to release folder locks
Stop-Process -Name "chrome" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# --- CONFIGURATION ---
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$staffUrl = "http://localhost:8080"
$customerUrl = "http://localhost:8080/display"

# Use very simple, short paths to avoid permission/length issues
$staffDataDir = "C:\POS_Staff"
$customerDataDir = "C:\POS_Customer"

# Create folders if they don't exist
if (!(Test-Path $staffDataDir)) { New-Item -ItemType Directory -Path $staffDataDir -Force }
if (!(Test-Path $customerDataDir)) { New-Item -ItemType Directory -Path $customerDataDir -Force }

# Define the Cache paths inside your custom data dirs
$customerCache = "$customerDataDir\Default\Cache"
$customerCodeCache = "$customerDataDir\Default\Code Cache"

# Wipe the cache folders if they exist
if (Test-Path $customerCache) { Remove-Item -Recurse -Force $customerCache }
if (Test-Path $customerCodeCache) { Remove-Item -Recurse -Force $customerCodeCache }

# Coordinates
$screen1X = 0
$screen2X = 1366
$width = 1366
$height = 768

# --- C# HELPER FOR WINDOW CONTROL ---
$code = @"
    using System;
    using System.Runtime.InteropServices;
    public class WindowManager {
        [DllImport("user32.dll")]
        public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();
        [DllImport("user32.dll")]
        public static extern bool SetForegroundWindow(IntPtr hWnd);
    }
"@
Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue

# --- LAUNCH STAFF ---
# Note: Removed single quotes around paths as they can sometimes cause issues in PowerShell Start-Process
$staffArgs = "--kiosk", $staffUrl, "--user-data-dir=$staffDataDir", "--window-position=0,0"
Start-Process $chromePath -ArgumentList $staffArgs
Start-Sleep -Seconds 3
$staffHwnd = [WindowManager]::GetForegroundWindow()
[WindowManager]::MoveWindow($staffHwnd, $screen1X, 0, $width, $height, $true)

# --- LAUNCH CUSTOMER ---
$customerArgs = "--kiosk", $customerUrl, "--user-data-dir=$customerDataDir", "--window-position=1366,0"
Start-Process $chromePath -ArgumentList $customerArgs
Start-Sleep -Seconds 3
$customerHwnd = [WindowManager]::GetForegroundWindow()
[WindowManager]::MoveWindow($customerHwnd, $screen2X, 0, $width, $height, $true)