// src/index.ts
import express from 'express';
import mongoose from 'mongoose';
import { MONGO_URI, PORT } from "./config/index.js";
import { AuthController } from './controllers/AuthController.js';
import {AuthService} from './services/AuthService.js';
import { MongoUserRepository } from './repositories/UserRepository.js';
import {SessionManager} from './services/SessionManager.js';


const sessionMan = SessionManager.getInstance()
const userRepo = new MongoUserRepository();
const authService = new AuthService(userRepo, sessionMan);
const auth = new AuthController(authService);

const app = express();
app.use(express.json());
app.post('/auth/signup', auth.signup.bind(auth)); //This line tells Express, When an HTTP POST arrives at /auth/signup, call the function signup.
app.post('/auth/login', auth.login.bind(auth));
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

