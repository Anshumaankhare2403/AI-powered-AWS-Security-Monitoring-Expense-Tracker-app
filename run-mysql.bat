@echo off
title Expense Tracker - MySQL 8 Server (Port 3307)
echo =========================================================
echo   Starting MySQL 8.0 Server on Port 3307
echo =========================================================
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --datadir="%~dp0database\mysqldata" --port=3307 --console
pause
