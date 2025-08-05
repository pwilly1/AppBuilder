// src/index.ts
import express from 'express';
import mongoose from 'mongoose';
import { MONGO_URI, PORT } from './config';
import { signup, login } from './controllers/authController.ts';




const app = express();
app.use(express.json());
app.post('/auth/signup', signup); //This line tells Express, “When an HTTP POST arrives at /auth/signup, call the function signup.
app.post('/auth/login', login);
app.get('/', (_, res) => {
  res.send('🚀 API running');
});

async function start() {
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
