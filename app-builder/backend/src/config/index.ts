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
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET is required');
}
export const JWT_SECRET = jwtSecret;
export const APP_USER_JWT_SECRET = process.env.APP_USER_JWT_SECRET?.trim() || JWT_SECRET;
export const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim() || '';
export const EMAIL_FROM = process.env.EMAIL_FROM?.trim() || '';
export const CORS_ORIGIN = process.env.CORS_ORIGIN?.trim() || '';
export const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim() || '';
export const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME?.trim() || 'apptura-assets';
export const AZURE_STORAGE_PUBLIC_BASE_URL = (process.env.AZURE_STORAGE_PUBLIC_BASE_URL?.trim() || '').replace(/\/+$/, '');


