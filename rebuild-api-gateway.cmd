@echo off
REM Rebuild and restart the API gateway (--no-deps is not supported on "compose build" in some Docker versions)
set "COMPOSEFILE=%~dp0docker-compose.microservices.yml"
docker compose -f "%COMPOSEFILE%" build api-gateway
if errorlevel 1 exit /b 1
REM Stop + remove first avoids "cannot remove container: container is running" on recreate
docker compose -f "%COMPOSEFILE%" rm -f -s api-gateway 2>nul
docker compose -f "%COMPOSEFILE%" up -d api-gateway
echo.
echo Gateway image updated. Try http://localhost:8081/health
