// --- Service Startup Diagnostic Logging ---
import { initialize, shutdown } from "./system/lifecycle.js";
import { logger } from "./utils/logger.js";

let isShuttingDown = false;

async function gracefulExit({ signal, code }) {
  if (isShuttingDown) {
    logger.warn("Graceful shutdown already in progress; ignoring duplicate signal.", {
      signal,
      code,
    });
    return;
  }

  isShuttingDown = true;
  logger.info("Starting graceful shutdown...", { signal, code });

  try {
    await shutdown();
  } catch (error) {
    logger.error("Graceful shutdown encountered an error.", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }

  process.exit(code);
}

async function main() {
  logger.info("SpeyPOS service starting...");

  try {
    await initialize();
    logger.info("System initialized successfully.");
  } catch (error) {
    logger.error("Failed to initialize system.", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  await gracefulExit({ signal: "SIGINT", code: 0 });
});

process.on("SIGTERM", async () => {
  await gracefulExit({ signal: "SIGTERM", code: 0 });
});

process.on("uncaughtException", async (error) => {
  logger.error("Uncaught Exception.", {
    error: error.message,
    stack: error.stack,
  });
  await gracefulExit({ signal: "uncaughtException", code: 1 });
});

process.on("unhandledRejection", async (reason) => {
  logger.error("Unhandled Promise Rejection.", {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  await gracefulExit({ signal: "unhandledRejection", code: 1 });
});

main();
