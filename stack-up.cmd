@echo off
REM Start the full stack in the right order. Do not use "up -d api-gateway" alone until DBs are healthy.
REM If you see "zombie and can not be killed": quit Docker Desktop, start it again, then run this.
set "COMPOSEFILE=%~dp0docker-compose.microservices.yml"
echo Starting full stack (Mongo x7 + RabbitMQ can take 5-15 minutes on Docker Desktop)...
docker compose -f "%COMPOSEFILE%" up -d --remove-orphans
if errorlevel 1 (
  echo.
  echo If dependencies keep failing: Docker Desktop -^> Settings -^> Resources - increase Memory ^(e.g. 8GB+^) and CPUs, then run this again.
  exit /b 1
)
echo.
docker compose -f "%COMPOSEFILE%" ps
echo.
echo When *-db and rabbitmq are healthy, open http://localhost:8081/health
echo To restart only the gateway after that: rebuild-api-gateway.cmd
