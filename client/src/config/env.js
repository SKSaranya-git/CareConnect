/**
 * Central API configuration — always talk to the API Gateway in production-like setups.
 * In dev, use same-origin `/api` so Vite proxies to the gateway (avoids CORS / embedded-browser blocks).
 * @see docs/GATEWAY_API.md
 */
const trimmed = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "");

export const API_BASE_URL = import.meta.env.DEV
  ? ""
  : trimmed || "http://localhost:8081";
