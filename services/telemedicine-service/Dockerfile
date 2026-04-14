FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install --omit=dev --no-audit --no-fund
COPY src ./src
EXPOSE 4005
CMD ["node", "src/server.js"]
