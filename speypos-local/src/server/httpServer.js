import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { env } from '../config/env.js';
import { paths } from '../config/paths.js';
import { logger } from '../utils/logger.js';
import { healthCheck } from './health.js';
import menuItemRouter from '../routes/menu-item.routes.js';
import menuCategoryRouter from '../routes/menu-category.routes.js';
import staffRouter from '../routes/staff.routes.js';
import shiftRouter from '../routes/shift.routes.js';
import mapRouter from '../routes/menu-item-category-map.routes.js';
import staffShiftRouter from '../routes/staff-shift.routes.js';
import orderRouter from '../routes/order.routes.js';
import authRouter from '../routes/auth.routes.js';
import uploadRouter from '../routes/upload.routes.js';
import mediaRouter from '../routes/media.routes.js';
import customizationGroupRouter from '../routes/customization-option-group.routes.js';
import customizationOptionRouter from '../routes/customization-option.routes.js';
import menuItemCustomizationGroupRouter from '../routes/menu-item-customization-group.routes.js';
import toppingGroupRouter from '../routes/topping-group.routes.js';
import toppingOptionRouter from '../routes/topping-option.routes.js';
import menuItemToppingGroupRouter from '../routes/menu-item-topping-group.routes.js';
import settingsRouter from '../routes/settings.routes.js';
import systemRouter from '../routes/system.routes.js';
import displayRouter from '../routes/display.routes.js';
import setupRouter from '../routes/setup.routes.js';
import storeRouter from '../routes/store.routes.js';
import menuCategoryCustomizationGroupRouter from '../routes/menu-category-customization-group.routes.js';
import menuCategoryToppingGroupRouter from '../routes/menu-category-topping-group.routes.js';
import syncRouter from '../routes/sync.routes.js';

const app = express();

// CORS Configuration
const corsOptions = {
  origin: env.corsOrigin,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json());

app.use((req, res, next) => {
  const startedAt = Date.now();
  const incoming = req.headers['x-request-id'];
  const requestId = typeof incoming === 'string' && incoming.length > 0
    ? incoming
    : randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    if (!req.originalUrl.startsWith('/api')) {
      return;
    }

    logger.info('HTTP request completed.', {
      event: 'http.request',
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
});

let server;
const connections = new Set();

/**
 * Starts the HTTP server and tracks connections.
 * @param {{ mode: 'SETUP' | 'NORMAL' }} options - The server startup options.
 */
export function startServer({ mode = 'NORMAL' }) {
  return new Promise((resolve) => {
    // --- Middleware & Routes ---
    const publicDir = paths.public;

    // 1. Static file serving
    app.use('/media', express.static(paths.images.base)); // Existing media route
    app.use(express.static(publicDir)); // Serve PWA assets

    // 2. API Routers
    app.get('/api/health', healthCheck);
    app.use('/api', systemRouter); // System routes available in all modes

    if (mode === 'SETUP') {
      logger.warn('SERVER STARTING IN SETUP MODE. Only /api/setup and /api/system are available.');
      app.use('/api/setup', setupRouter);
    } else {
      logger.info('Server starting in Normal Mode.');
      app.use('/api', authRouter);
      app.use('/api', uploadRouter);
      app.use('/api', mediaRouter);
      app.use('/api', menuItemRouter);
      app.use('/api', menuCategoryRouter);
      app.use('/api', staffRouter);
      app.use('/api', shiftRouter);
      app.use('/api', mapRouter);
      app.use('/api', staffShiftRouter);
      app.use('/api', orderRouter);
      app.use('/api', customizationGroupRouter);
      app.use('/api', customizationOptionRouter);
      app.use('/api', menuItemCustomizationGroupRouter);
      app.use('/api', toppingGroupRouter);
      app.use('/api', toppingOptionRouter);
      app.use('/api', menuItemToppingGroupRouter);
      app.use('/api', settingsRouter);
      app.use('/api', displayRouter);
      app.use('/api', syncRouter);
      app.use('/api', storeRouter);
      app.use('/api', menuCategoryCustomizationGroupRouter);
      app.use('/api', menuCategoryToppingGroupRouter);
    }

    // 3. SPA Catch-all for frontend routing
    // This route handles all requests that are not for the API or media files.
    app.get(/^(?!\/api|\/media).*$/, (req, res) => {
      const indexPath = `${publicDir}/index.html`;
      res.sendFile(indexPath);
    });

    // --- Server Lifecycle ---
    server = app.listen(env.port, () => {
      logger.info(`HTTP server listening on http://localhost:${env.port}`);
      resolve();
    });

    server.on('connection', (conn) => {
      connections.add(conn);
      conn.on('close', () => {
        connections.delete(conn);
      });
    });
  });
}

/**
 * Stops the HTTP server gracefully.
 */
export function stopServer() {
  return new Promise((resolve) => {
    if (!server) {
      return resolve();
    }
    server.close(() => {
      logger.info('HTTP server stopped.');
      resolve();
    });
    setTimeout(() => {
      if (connections.size > 0) {
        logger.warn(`Forcibly closing ${connections.size} open connection(s).`);
        for (const conn of connections) {
          conn.destroy();
        }
      }
    }, 3000);
  });
}
