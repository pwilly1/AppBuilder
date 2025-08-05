// src/config/index.ts
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(__dirname, '../../.env')
});

export const MONGO_URI = process.env.MONGO_URI || '';
export const PORT      = Number(process.env.PORT) || 3000;
export const JWT_SECRET = process.env.JWT_SECRET || '';


// export const JWT_SECRET = process.env.JWT_SECRET || '';
