// src/index.ts
import express from 'express';
import mongoose from 'mongoose';
import { MONGO_URI, PORT } from "./config/index.js";
import { AuthController } from './controllers/AuthController.js';
import {AuthService} from './services/AuthService.js';
import { MongoUserRepository } from './repositories/UserRepository.js';
import {SessionManager} from './services/SessionManager.js';
import { makeAuthRoutes } from './routes/AuthRoutes.js';
import { makeProjectRoutes } from './routes/ProjectRoutes.js';



const sessionMan = SessionManager.getInstance()
const userRepo = new MongoUserRepository();
const authService = new AuthService(userRepo, sessionMan);
const auth = new AuthController(authService);

const app = express(); 
app.use(express.json());// express use allows me to use middleware for incoming requests
// Simple CORS middleware for development: allows the frontend dev server to call this API
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use('/auth', makeAuthRoutes(auth));
app.use('/projects', makeProjectRoutes());
app.get('/', (_, res) => {
  res.send(' API running');
});



async function start() {
    if (!MONGO_URI) {
    console.error('MONGO_URI is not defined');
    process.exit(1);
  }
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error(' MongoDB connection error:', err);
    process.exit(1);
  }

  app.listen(PORT, () =>
    console.log(`Server listening on http://localhost:${PORT}`)
  );
}

start();

