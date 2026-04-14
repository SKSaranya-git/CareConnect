@echo off
REM Wipe RabbitMQ container + its data volume (fixes Restarting (1) after hostname/node name changes)
set "COMPOSEFILE=%~dp0docker-compose.microservices.yml"
docker compose -f "%COMPOSEFILE%" stop rabbitmq 2>nul
docker compose -f "%COMPOSEFILE%" rm -f -v rabbitmq
docker compose -f "%COMPOSEFILE%" up -d rabbitmq
echo.
echo Wait 1-3 minutes, then: docker compose -f "%COMPOSEFILE%" ps
echo Logs: docker logs rabbitmq --tail 50
