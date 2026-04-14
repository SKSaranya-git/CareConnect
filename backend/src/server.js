require("dotenv").config();
const dns = require("dns");
const http = require("http");

const app = require("./app");
const { connectDB } = require("./config/db");

const BASE_PORT = Number(process.env.PORT || 5000);

const dnsServers = (process.env.DNS_SERVERS || "")
  .split(",")
  .map((server) => server.trim())
  .filter(Boolean);

if (dnsServers.length > 0) {
  dns.setServers(dnsServers);
}

async function startServer() {
  try {
    await connectDB(process.env.MONGO_URI);
    console.log("MongoDB connected successfully.");

    await startHttpServer(app, BASE_PORT);
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
}

function startHttpServer(expressApp, preferredPort) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(expressApp);

    server.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        const nextPort = preferredPort + 1;
        console.warn(`Port ${preferredPort} is busy. Retrying on ${nextPort}...`);
        resolve(startHttpServer(expressApp, nextPort));
        return;
      }
      reject(error);
    });

    server.listen(preferredPort, () => {
      console.log(`Server running on http://localhost:${preferredPort}`);
      resolve(server);
    });
  });
}

startServer();
