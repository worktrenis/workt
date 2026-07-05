@echo off
rem Simple launcher for the backup script. Double-click to execute.
powershell -NoProfile -ExecutionPolicy Bypass -Command "& '%~dp0scripts\backup-with-notes.ps1'"


pause >nulnecho Backup script finished. Press any key to close this window...