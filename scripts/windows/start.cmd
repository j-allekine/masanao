@echo off
"%~dp0..\..\node.exe" "%~dp0launcher.mjs" start
if errorlevel 1 pause
