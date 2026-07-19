import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { CORS_ORIGIN, JWT_SECRET, MONGO_URI, PORT } from './config/index.js';
import { AppDataController } from './controllers/AppDataController.js';
import { AssetController } from './controllers/AssetController.js';
import { AuthController } from './controllers/authController.js';
import { ProjectController } from './controllers/ProjectController.js';
import { createRequireAuth } from './middleware/auth.js';
import { MongoProjectRepository } from './repositories/MongoProjectRepository.js';
import { MongoUserRepository } from './repositories/UserRepository.js';
import { makeAppDataRoutes, makePublicAppDataRoutes } from './routes/AppDataRoutes.js';
import { makeAssetRoutes } from './routes/AssetRoutes.js';
import { makeAuthRoutes } from './routes/AuthRoutes.js';
import { makeProjectRoutes } from './routes/ProjectRoutes.js';
import { AssetStorageService } from './services/AssetStorageService.js';
import { AuthService } from './services/AuthService.js';
import { EmailNotificationService } from './services/EmailNotificationService.js';
import { JwtService, type TokenExpiry } from './services/JwtService.js';
import { ProjectManager } from './services/ProjectManager.js';

const userRepository = new MongoUserRepository();
const projectRepository = new MongoProjectRepository();
const tokenExpiry = process.env.JWT_EXPIRES_IN?.trim() as TokenExpiry | undefined;
const tokens = new JwtService(JWT_SECRET, tokenExpiry);
const projects = new ProjectManager(projectRepository, userRepository);
const requireAuth = createRequireAuth(tokens, userRepository);

const authController = new AuthController(new AuthService(userRepository, tokens));
const projectController = new ProjectController(projects);
const assetController = new AssetController(projects, new AssetStorageService());
const appDataController = new AppDataController(projects, new EmailNotificationService());

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '64kb' }));

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean),
]);

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  if (!requestOrigin || allowedOrigins.has(requestOrigin)) {
    res.header('Access-Control-Allow-Origin', requestOrigin ?? '*');
  }
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use('/auth', makeAuthRoutes(authController, requireAuth));
app.use('/projects', makeAssetRoutes(assetController, requireAuth));
app.use('/projects', makeAppDataRoutes(appDataController, requireAuth));
app.use('/projects', makeProjectRoutes(projectController, requireAuth));
app.use('/public', makePublicAppDataRoutes(appDataController));

app.get('/', (_req, res) => res.send(' API running'));
app.get('/health', (_req, res) => res.json({ ok: true }));

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled request error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  if (!MONGO_URI) {
    console.error('MONGO_URI is not defined');
    process.exit(1);
  }
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }

  app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
}

start();
