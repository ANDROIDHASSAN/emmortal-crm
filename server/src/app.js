import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { env } from './config/env.js';
import { swaggerSpec } from './config/swagger.js';
import api from './routes/api.js';
import publicSite from './public-site/site.routes.js';
import { notFound, errorHandler } from './middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  // View engine for SEO-rendered public pages.
  app.set('view engine', 'ejs');
  app.set('views', path.resolve(__dirname, 'public-site/views'));

  app.use(
    helmet({
      contentSecurityPolicy: false, // relax for SPA + inline meta; tighten per deployment
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS only in dev (Vite on a different port). In prod everything is same-origin.
  if (!env.isProd) {
    app.use(
      cors({
        origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
        credentials: true,
      })
    );
  }

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(morgan(env.isProd ? 'combined' : 'dev'));

  // API
  app.use('/api/v1', api);

  // Swagger docs
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
  app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));

  // Public SEO storefront (server-rendered) + sitemap/robots
  app.use('/', publicSite);

  // In production, serve the built React SPA under /app/* and assets.
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (env.isProd && fs.existsSync(clientDist)) {
    app.use('/app', express.static(clientDist));
    // SPA fallback for client-side routing under /app
    app.get('/app/*', (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // 404 + error envelope (API + unknown)
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
