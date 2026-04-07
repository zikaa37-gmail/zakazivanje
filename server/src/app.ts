import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { connectDatabase } from './core/database/connection';
import { initModels } from './core/database/models';
import { errorHandler } from './core/middleware/error.middleware';
import { notFoundHandler } from './core/middleware/not-found.middleware';
import { swaggerSpec } from './core/swagger.config';
import authRoutes from './modules/auth/auth.controller';
import healthRoutes from './modules/health/health.controller';

dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const app: Express = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(compression());
app.use(morgan('dev'));

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/health', healthRoutes);

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Zakazivanje API Docs',
  }),
);

app.use('/api/auth', authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  try {
    initModels();
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV}`);
      console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
