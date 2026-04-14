@echo off
REM Full compose file name (avoid truncated -f docker-compose.micro)
REM Gateway-only rebuild: use rebuild-api-gateway.cmd
docker compose -f "%~dp0docker-compose.microservices.yml" %*
