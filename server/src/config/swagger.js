import swaggerJSDoc from 'swagger-jsdoc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'E-mmortal Operations CRM API',
      version: '1.0.0',
      description: 'REST API for E-mmortal CRM + Storefront. All routes under /api/v1.',
    },
    servers: [{ url: '/api/v1' }],
    components: {
      securitySchemes: {
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'emm_at' },
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ cookieAuth: [] }, { bearerAuth: [] }],
  },
  apis: [
    path.resolve(__dirname, '../modules/**/*.routes.js'),
    path.resolve(__dirname, '../modules/**/*.js'),
  ],
});

export default swaggerSpec;
