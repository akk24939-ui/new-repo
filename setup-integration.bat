@echo off
title VitaSage AI -- Integration Setup
color 0B
echo.
echo  ==========================================
echo   VitaSage AI - Patient-Doctor Integration
echo   Creates patient_diagnosis_reports table
echo  ==========================================
echo.
cd /d "%~dp0backend"
python setup_integration.py
echo.
pause
