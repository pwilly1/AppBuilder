// src/config/index.ts
import "dotenv/config"
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });


export const MONGO_URI = process.env.MONGO_URI;
export const PORT      = Number(process.env.PORT) || 3000;
export const JWT_SECRET = process.env.JWT_SECRET || '';


