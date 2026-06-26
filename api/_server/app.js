import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { env } from './config/env.js';
import api from './routes/api.js';
import publicSite from './public-site/site.routes.js';
import { notFound, errorHandler } from './middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.set('view engine', 'ejs');
  app.set('views', path.resolve(__dirname, 'public-site/views'));

  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  // CORS: allow local Vite (dev) + the deployed frontend origin(s) from CLIENT_ORIGIN.
  // credentials:true is required so the cross-site auth cookie is sent/received.
  const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', ...env.CLIENT_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)];
  app.use(cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  }));

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(morgan(env.isProd ? 'combined' : 'dev'));

  app.use('/api/v1', api);

  // Single-origin: serve the built React CRM at /app so the website and CRM
  // live together (website "CRM Login" → /app/login works without a 2nd port).
  // Build first: `npm run build` → dist/app. (On Vercel, /app is served by the
  // CDN; this block covers local `npm start` and Render.)
  const clientDist = path.resolve(__dirname, '../../dist/app');
  if (fs.existsSync(clientDist)) {
    app.use('/app', express.static(clientDist));
    app.get('/app/*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use('/', publicSite); // SEO storefront + sitemap/robots

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

export default createApp;
